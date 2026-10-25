package services.system.api

import cats.effect.{IO, IOApp, Ref, Resource}
import cats.syntax.all.*
import cats.effect.std.Supervisor
import com.comcast.ip4s.*
import fs2.Stream
import io.circe.{parser, Json}
import org.http4s.ember.server.EmberServerBuilder
import scala.concurrent.duration.*
import services.rooms.api.{CloseRoomsMessage, TickRoomsMessage}
import services.rooms.routes.RoomRoutes
import services.system.objects.{Connection, ServerConfig}
import services.system.routes.{APIMessageRouter, StaticRoutes, SystemRoutes}
import services.system.utils.AdmissionControl

object Main extends IOApp.Simple:
  private def resourceText(name: String): IO[String] =
    Resource
      .fromAutoCloseable(IO(getClass.getResourceAsStream("/" + name)))
      .use(stream =>
        IO.blocking(new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
      )

  def run: IO[Unit] =
    IO {
      ServerConfig(
        sys.env.getOrElse("HOST", "0.0.0.0"),
        sys.env.get("PORT").flatMap(_.toIntOption).getOrElse(8080),
        sys.env.getOrElse("WEB_ROOT", "../frontend/dist"),
        sys.env
          .get("MAX_ROOMS")
          .fold(20)(value =>
            value.toIntOption
              .filter(_ > 0)
              .getOrElse(
                throw IllegalArgumentException("MAX_ROOMS must be a positive integer")
              )
          ),
        sys.env.get("TRUST_LOCAL_PROXY").contains("true")
      )
    }.flatMap { config =>
      Supervisor[IO].use { supervisor =>
        (
          Ref.of[IO, Map[String, services.rooms.utils.RoomRuntime]](Map.empty),
          Ref.of[IO, Map[String, services.rooms.objects.Session]](Map.empty),
          resourceText("simulation.js"),
          resourceText("stages.json").flatMap(raw =>
            IO.fromEither(parser.decode[Vector[Json]](raw))
          ),
          AdmissionControl.create(config.trustLocalProxy)
        ).mapN((rooms, sessions, source, stages, admission) =>
          (Connection(rooms, sessions, source, stages, config, supervisor), admission)
        ).flatMap { (connection, admission) =>
          val clock = Stream
            .awakeEvery[IO](1.second)
            .evalMap(_ => TickRoomsMessage().plan(connection))
            .compile
            .drain
          val server = EmberServerBuilder
            .default[IO]
            .withHost(Host.fromString(config.host).getOrElse(host"0.0.0.0"))
            .withPort(Port.fromInt(config.port).getOrElse(port"8080"))
            .withHttpWebSocketApp(builder =>
              admission.wrap(
                (SystemRoutes.routes <+> APIMessageRouter
                  .routes(RoomRoutes.apiMessages, connection) <+> RoomRoutes
                  .socketRoutes(connection, builder) <+> StaticRoutes
                  .routes(config.webRoot)).orNotFound
              )
            )
            .build
          server
            .use { _ =>
              IO.println(
                s"MyGO Scala server: http://localhost:${config.port}\nLAN: open http://<this computer's LAN IP>:${config.port} on both devices."
              ) *>
                clock
            }
            .guarantee(CloseRoomsMessage().plan(connection))
        }
      }
    }
