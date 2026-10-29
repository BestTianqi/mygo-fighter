package services.edge.utils

import cats.effect.kernel.Deferred
import cats.effect.std.{Dispatcher, Queue}
import cats.effect.{IO, Resource}
import fs2.Stream
import java.net.URI
import java.net.http.{HttpClient, WebSocket}
import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, CompletionStage}
import org.http4s.websocket.WebSocketFrame
import scala.concurrent.duration.*
import scala.util.Try
import scodec.bits.ByteVector

/** One upstream rooms socket. `frames` is the bounded downstream stream; `send` writes one browser
  * frame upstream. Closing or aborting the JDK socket ends `frames`, and a full queue aborts the
  * socket instead of buffering more traffic bound for a slow browser.
  */
private[edge] final class UpstreamSocket(
    socket: WebSocket,
    framesQueue: Queue[IO, Option[WebSocketFrame]],
    closed: Deferred[IO, Unit]
):
  private[edge] val frames: Stream[IO, WebSocketFrame] =
    Stream.fromQueueNoneTerminated(framesQueue).interruptWhen(closed.get.attempt)

  private[edge] def send(frame: WebSocketFrame): IO[Unit] =
    frame match
      case WebSocketFrame.Text(data, last) =>
        sendFuture(socket.sendText(data, last))
      case WebSocketFrame.Binary(data, last) =>
        sendFuture(socket.sendBinary(ByteBuffer.wrap(data.toArray), last))
      case WebSocketFrame.Ping(data) =>
        sendFuture(socket.sendPing(ByteBuffer.wrap(data.toArray)))
      case WebSocketFrame.Pong(data) =>
        sendFuture(socket.sendPong(ByteBuffer.wrap(data.toArray)))
      case close: WebSocketFrame.Close =>
        sendFuture(socket.sendClose(closeCode(close), Option(close.reason).getOrElse("")))
      case WebSocketFrame.Continuation(_, _) =>
        // Ember defragments client frames before this pipe, so a bare continuation is unexpected.
        IO.raiseError(IllegalArgumentException("不支持的 WebSocket 分片"))

  /** Closes the outbound socket; the enclosing resource finalizer also releases the listener. */
  private[edge] def close: IO[Unit] = IO(socket.abort())

  private def sendFuture(action: => CompletableFuture[WebSocket]): IO[Unit] =
    IO.fromCompletableFuture(IO(action)).void

  /** `sendClose` rejects reserved status codes; fall back to a normal closure. */
  private def closeCode(frame: WebSocketFrame.Close): Int =
    val code = frame.closeCode
    if code >= 1000 && code <= 4999 && code != 1005 && code != 1006 && code != 1015 then code
    else 1000

/** Creates JDK WebSocket connections to one rooms instance and bridges them to http4s frames. A
  * sequential dispatcher runs listener effects in delivery order and never on the JDK selector.
  */
private[edge] final class SocketProxy private (client: HttpClient, queueFrames: Int):
  private val ConnectTimeout = 3.seconds

  private[edge] def connect(
      url: String,
      secret: Option[String]
  ): Resource[IO, UpstreamSocket] =
    for
      dispatcher <- Dispatcher.sequential[IO]
      frames <- Resource.eval(Queue.bounded[IO, Option[WebSocketFrame]](queueFrames))
      closed <- Resource.eval(Deferred[IO, Unit])
      socket <- Resource.make(open(url, secret, frames, closed, dispatcher))(ws => IO(ws.abort()))
    yield UpstreamSocket(socket, frames, closed)

  private def open(
      url: String,
      secret: Option[String],
      frames: Queue[IO, Option[WebSocketFrame]],
      closed: Deferred[IO, Unit],
      dispatcher: Dispatcher[IO]
  ): IO[WebSocket] =
    for
      uri <- IO(URI.create(url))
      socket <-
        IO.fromCompletableFuture(IO {
          val builder = client
            .newWebSocketBuilder()
            .connectTimeout(java.time.Duration.ofMillis(ConnectTimeout.toMillis))
          secret.foreach(value => builder.header("X-Mygo-Internal", value))
          builder.buildAsync(uri, new BridgeListener(frames, closed, dispatcher))
        }).timeout(ConnectTimeout)
    yield socket

private[edge] object SocketProxy:
  private[edge] def create(client: HttpClient, queueFrames: Int): SocketProxy =
    new SocketProxy(client, queueFrames)

/** Translates JDK WebSocket callbacks into complete http4s frames, one unit of demand at a time. */
private[edge] final class BridgeListener(
    frames: Queue[IO, Option[WebSocketFrame]],
    closed: Deferred[IO, Unit],
    dispatcher: Dispatcher[IO]
) extends WebSocket.Listener:
  private val MaxMessageBytes = 4 * 1024 * 1024
  private var textBuffer: Option[StringBuilder] = None
  private var binaryBuffer: Option[java.io.ByteArrayOutputStream] = None

  override def onOpen(webSocket: WebSocket): Unit =
    webSocket.request(1)

  override def onText(
      webSocket: WebSocket,
      data: CharSequence,
      last: Boolean
  ): CompletionStage[?] =
    val buffer = textBuffer.getOrElse(new StringBuilder)
    buffer.append(data)
    if buffer.length > MaxMessageBytes then
      textBuffer = None
      abort(webSocket)
    else if last then
      textBuffer = None
      emit(webSocket, WebSocketFrame.Text(buffer.toString, true))
    else
      textBuffer = Some(buffer)
      webSocket.request(1)
    completed

  override def onBinary(
      webSocket: WebSocket,
      data: ByteBuffer,
      last: Boolean
  ): CompletionStage[?] =
    val buffer = binaryBuffer.getOrElse(new java.io.ByteArrayOutputStream)
    buffer.write(copyBytes(data))
    if buffer.size() > MaxMessageBytes then
      binaryBuffer = None
      abort(webSocket)
    else if last then
      binaryBuffer = None
      emit(webSocket, WebSocketFrame.Binary(ByteVector.view(buffer.toByteArray), true))
    else
      binaryBuffer = Some(buffer)
      webSocket.request(1)
    completed

  override def onPing(webSocket: WebSocket, message: ByteBuffer): CompletionStage[?] =
    val bytes = copyBytes(message)
    quietly(webSocket.sendPong(ByteBuffer.wrap(bytes)))
    emit(webSocket, WebSocketFrame.Ping(ByteVector.view(bytes)))
    completed

  override def onPong(webSocket: WebSocket, message: ByteBuffer): CompletionStage[?] =
    emit(webSocket, WebSocketFrame.Pong(ByteVector.view(copyBytes(message))))
    completed

  override def onClose(
      webSocket: WebSocket,
      statusCode: Int,
      reason: String
  ): CompletionStage[?] =
    finish(WebSocketFrame.Close(statusCode, Option(reason).getOrElse("")).toOption)
    completed

  override def onError(webSocket: WebSocket, error: Throwable): Unit =
    dispatch(closed.complete(()).void)
    abortQuietly(webSocket)

  private def completed: CompletionStage[?] =
    CompletableFuture.completedFuture[AnyRef](null)

  /** Offers one complete frame and only then returns demand to the JDK socket. */
  private def emit(webSocket: WebSocket, frame: WebSocketFrame): Unit =
    dispatch(
      frames.tryOffer(Some(frame)).flatMap { accepted =>
        if accepted then IO(webSocket.request(1))
        else IO(webSocket.abort()) *> closed.complete(()).void
      }
    )

  private def finish(close: Option[WebSocketFrame.Close]): Unit =
    dispatch {
      val leading = close.fold(IO.unit)(frame => frames.tryOffer(Some(frame)).void)
      leading *> frames.tryOffer(None).void *> closed.complete(()).void
    }

  private def abort(webSocket: WebSocket): Unit =
    dispatch(closed.complete(()).void)
    abortQuietly(webSocket)

  private def dispatch(effect: IO[Unit]): Unit =
    quietly(dispatcher.unsafeRunAndForget(effect))

  private def abortQuietly(webSocket: WebSocket): Unit =
    quietly(webSocket.abort())

  /** JDK callbacks may race connection teardown; a late callback must never crash the listener. */
  private def quietly(action: => Unit): Unit =
    Try(action).fold(_ => (), _ => ())

  private def copyBytes(buffer: ByteBuffer): Array[Byte] =
    val copy = buffer.duplicate()
    val bytes = new Array[Byte](copy.remaining())
    copy.get(bytes)
    bytes
