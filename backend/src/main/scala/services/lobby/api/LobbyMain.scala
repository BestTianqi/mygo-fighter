package services.lobby.api

import cats.effect.{IO, Ref, Resource}
import cats.effect.std.{Semaphore, Supervisor}
import cats.syntax.all.*
import com.comcast.ip4s.*
import fs2.Stream
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.implicits.*
import scala.concurrent.duration.*
import services.lobby.objects.{InstanceRecord, LobbyConfig, LobbyConnection, Reservation}
import services.lobby.routes.LobbyInternalRoutes
import services.lobby.utils.Registry

/** One lobby process. It is the only component that owns the global room budget and the
  * code-to-instance directory; both are rebuilt from rooms heartbeats after a restart, so the lobby
  * holds no durable state and does not sit in the combat path.
  */
object LobbyMain:
  def resource(config: LobbyConfig): Resource[IO, Unit] =
    Supervisor[IO].flatMap { supervisor =>
      Resource.eval(connection(config)).flatMap { lobby =>
        Resource.eval(IO.println(s"Lobby: http://${config.host}:${config.port}")) *>
          background(lobby, supervisor) *>
          server(lobby)
      }
    }

  private def connection(config: LobbyConfig): IO[LobbyConnection] =
    for
      instances <- Ref.of[IO, Map[String, InstanceRecord]](Map.empty)
      directory <- Ref.of[IO, Map[String, String]](Map.empty)
      reservations <- Ref.of[IO, Map[String, Reservation]](Map.empty)
      placementLock <- Semaphore[IO](1)
    yield LobbyConnection(config, instances, directory, reservations, placementLock)

  private def server(lobby: LobbyConnection): Resource[IO, Unit] =
    EmberServerBuilder
      .default[IO]
      .withHost(Host.fromString(lobby.config.host).getOrElse(host"127.0.0.1"))
      .withPort(Port.fromInt(lobby.config.port).getOrElse(port"8079"))
      .withHttpApp(LobbyInternalRoutes.routes(lobby).orNotFound)
      .build
      .void

  private def background(lobby: LobbyConnection, supervisor: Supervisor[IO]): Resource[IO, Unit] =
    val cleanup = Stream
      .awakeEvery[IO](1.second)
      .evalMap(_ =>
        Registry
          .expire(lobby)
          .handleErrorWith(error => IO.println(s"Lobby cleanup failed: $error"))
      )
    Resource.make(supervisor.supervise(cleanup.compile.drain))(_.cancel).void
