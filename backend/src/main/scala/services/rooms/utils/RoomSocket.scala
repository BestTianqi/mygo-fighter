package services.rooms.utils

import cats.effect.{IO, Ref}
import cats.syntax.all.*
import fs2.Stream
import io.circe.{parser, Json}
import io.circe.syntax.*
import org.http4s.{HttpRoutes, Request}
import org.http4s.dsl.io.*
import org.http4s.server.websocket.WebSocketBuilder2
import org.http4s.websocket.WebSocketFrame
import scala.concurrent.duration.*
import services.rooms.api.{
  AttachRoomMessage,
  DisconnectRoomMessage,
  ResolveSessionMessage,
  SubmitInputMessage
}
import services.rooms.objects.{GameProtocol, PlayerInput, Session}

import services.system.objects.Connection

object RoomSocket:
  private[rooms] def routes(
      connection: Connection,
      builder: WebSocketBuilder2[IO]
  ): HttpRoutes[IO] = HttpRoutes.of[IO] { case request @ GET -> Root / "ws" =>
    if !services.system.routes.APIMessageRouter.sameOrigin(request) then Forbidden()
    else
      (
        Peer.create,
        Ref.of[IO, Option[Session]](None),
        Ref.of[IO, (FiniteDuration, Int)]((Duration.Zero, 0))
      ).tupled.flatMap { (peer, identity, rate) =>
        val close = identity.get.flatMap(
          _.traverse_(session => DisconnectRoomMessage(session, peer.id).plan(connection))
        )
        val timeout = Stream
          .eval(
            IO.sleep(5.seconds) *> identity.get.flatMap(s =>
              if s.isEmpty then peer.control.tryOffer(WebSocketFrame.Close()).void else IO.unit
            )
          )
          .drain
        val receive: fs2.Pipe[IO, WebSocketFrame, Unit] = _.evalMap {
          case WebSocketFrame.Text(raw, _) =>
            val action = IO.raiseWhen(raw.length > 8192)(IllegalArgumentException("请求过大")) *>
              IO.monotonic.flatMap { now =>
                rate
                  .modify { (start, count) =>
                    if now - start >= 1.second then ((now, 1), true)
                    else ((start, count + 1), count < 300)
                  }
                  .flatMap(allowed =>
                    IO.raiseUnless(allowed)(IllegalArgumentException("输入过于频繁"))
                  ) *> peer.seenAt.set(now)
              } *>
              IO.fromEither(parser.parse(raw)).flatMap { json =>
                IO.fromEither(json.hcursor.get[String]("type")).flatMap {
                  case "authenticate" =>
                    IO.raiseUnless(
                      json.hcursor.get[Int]("protocol").toOption.contains(GameProtocol.Version)
                    )(
                      IllegalArgumentException("客户端与主机版本不一致，请房主重启联机服务，双方刷新页面。")
                    ) *> identity.get.flatMap(current =>
                      IO.raiseWhen(current.nonEmpty)(IllegalArgumentException("连接已认证"))
                    ) *>
                      IO.fromEither(json.hcursor.get[String]("token"))
                        .flatMap(token => ResolveSessionMessage(token).plan(connection))
                        .flatMap { session =>
                          AttachRoomMessage(session, peer)
                            .plan(connection) *> identity.set(Some(session))
                        }
                  case "ping" =>
                    peer.send(
                      "pong",
                      Json.obj(
                        "sentAt" -> json.hcursor.downField("sentAt").focus.getOrElse(Json.Null)
                      )
                    )
                  case "input" =>
                    identity.get
                      .flatMap(s => IO.fromOption(s)(IllegalArgumentException("请先连接房间")))
                      .flatMap { session =>
                        IO.fromEither(
                          PlayerInput.sanitize(json).left.map(IllegalArgumentException(_))
                        ).flatMap { packet =>
                          SubmitInputMessage(session, peer.id, packet).plan(connection)
                        }
                      }
                  case _ => IO.raiseError(IllegalArgumentException("未知消息"))
                }
              }
            action.handleErrorWith(error =>
              peer.send(
                "error",
                Json.obj("message" -> Option(error.getMessage).getOrElse("连接失败").asJson)
              )
            )
          case _ => IO.unit
        }
        builder.withOnClose(close).build(peer.frames.merge(timeout), receive)
      }
  }
