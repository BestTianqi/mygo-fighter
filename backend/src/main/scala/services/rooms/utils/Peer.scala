package services.rooms.utils

import cats.effect.{Deferred, IO, Ref}
import cats.effect.std.Queue
import cats.syntax.all.*
import fs2.Stream
import fs2.concurrent.SignallingRef
import org.http4s.websocket.WebSocketFrame
import scala.concurrent.duration.*

/** Latest-only states share the socket with bounded reliable events; overflow forces resync. */
final case class Peer(
    id: String,
    control: Queue[IO, WebSocketFrame],
    latest: SignallingRef[IO, Option[String]],
    seenAt: Ref[IO, FiniteDuration],
    resync: Deferred[IO, Unit]
):
  private[rooms] def send(kind: String, data: io.circe.Json): IO[Unit] =
    control
      .tryOffer(
        WebSocketFrame.Text(
          io.circe.Json.obj("type" -> io.circe.Json.fromString(kind), "data" -> data).noSpaces
        )
      )
      .void

  private[rooms] def sendEvent(raw: String): IO[Unit] =
    control.tryOffer(WebSocketFrame.Text(raw)).flatMap { offered =>
      if offered then IO.unit else resync.complete(()).void
    }

  private[rooms] def frames: Stream[IO, WebSocketFrame] =
    Stream
      .fromQueueUnterminated(control)
      .merge(latest.discrete.unNone.map(WebSocketFrame.Text(_)))
      .merge(Stream.eval(resync.get.map(_ => WebSocketFrame.Close())))

object Peer:
  private[rooms] def create: IO[Peer] =
    (
      IO(java.util.UUID.randomUUID().toString),
      Queue.bounded[IO, WebSocketFrame](64),
      SignallingRef[IO, Option[String]](None),
      IO.monotonic.flatMap(Ref.of[IO, FiniteDuration]),
      Deferred[IO, Unit]
    ).mapN(Peer.apply)
