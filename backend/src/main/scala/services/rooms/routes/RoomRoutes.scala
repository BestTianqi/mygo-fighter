package services.rooms.routes

import cats.effect.IO
import cats.syntax.all.*
import io.circe.{Decoder, Json}
import io.circe.syntax.*
import services.rooms.api.*
import services.rooms.objects.Session
import services.system.objects.Connection
import services.system.routes.APIRegistration
import scala.reflect.ClassTag

object RoomRoutes:
  def socketRoutes(
      connection: Connection,
      builder: org.http4s.server.websocket.WebSocketBuilder2[IO]
  ): org.http4s.HttpRoutes[IO] =
    services.rooms.utils.RoomSocket.routes(connection, builder)

  private def field[A: Decoder](json: Json, name: String): IO[A] =
    IO.fromEither(json.hcursor.get[A](name))
  private def authenticated[M: ClassTag](
      run: (Json, Session, Connection) => IO[Unit]
  ): APIRegistration =
    APIRegistration.named[M] { (json, connection) =>
      field[String](json, "token")
        .flatMap(token => ResolveSessionMessage(token).plan(connection))
        .flatMap { session =>
          run(json, session, connection).as(Json.obj("ok" -> true.asJson))
        }
    }

  val apiMessages: Vector[APIRegistration] = Vector(
    APIRegistration.named[CreateRoomMessage]((_, c) => CreateRoomMessage().plan(c).map(_.asJson)),
    APIRegistration.named[JoinRoomMessage]((j, c) =>
      field[String](j, "code").flatMap(code => JoinRoomMessage(code).plan(c)).map(_.asJson)
    ),
    authenticated[ChooseRoomMessage]((j, s, c) =>
      (
        field[Option[Int]](j, "character"),
        field[Option[Int]](j, "arena"),
        field[Option[Boolean]](j, "terrain")
      ).tupled.flatMap((character, arena, terrain) =>
        ChooseRoomMessage(s, character, arena, terrain).plan(c)
      )
    ),
    authenticated[ReadyRoomMessage]((j, s, c) =>
      field[Boolean](j, "ready").flatMap(ready => ReadyRoomMessage(s, ready).plan(c))
    ),
    authenticated[LoadedRoomMessage]((j, s, c) =>
      field[Int](j, "generation").flatMap(generation => LoadedRoomMessage(s, generation).plan(c))
    ),
    authenticated[PauseRoomMessage]((j, s, c) =>
      field[Boolean](j, "paused").flatMap(paused => PauseRoomMessage(s, paused).plan(c))
    ),
    authenticated[RestartRoomMessage]((_, s, c) => RestartRoomMessage(s).plan(c)),
    authenticated[LobbyRoomMessage]((_, s, c) => LobbyRoomMessage(s).plan(c)),
    authenticated[LeaveRoomMessage]((_, s, c) => LeaveRoomMessage(s).plan(c))
  )
