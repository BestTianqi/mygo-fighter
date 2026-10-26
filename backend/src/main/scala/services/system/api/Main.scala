package services.system.api

import cats.effect.{IO, IOApp, Ref, Resource}
import cats.syntax.all.*
import cats.effect.std.Supervisor
import com.comcast.ip4s.*
import fs2.Stream
import fs2.io.net.SocketOption
import io.circe.{parser, Json}
import org.http4s.ember.server.EmberServerBuilder
import org.graalvm.polyglot.{Engine, Source}
import scala.concurrent.duration.*
import services.rooms.api.{CloseRoomsMessage, TickRoomsMessage}
import services.rooms.objects.GameLimits
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

  private def simulationRuntime: Resource[IO, (Engine, Source)] =
    Resource
      .make(IO.blocking(Engine.newBuilder("js").build()))(engine => IO.blocking(engine.close()))
      .evalMap(engine =>
        resourceText("simulation.js").flatMap(raw =>
          IO.blocking(Source.newBuilder("js", raw, "simulation.js").cached(true).build())
            .map(source => (engine, source))
        )
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
      simulationRuntime.use { (engine, source) =>
        Supervisor[IO].use { supervisor =>
          (
            Ref.of[IO, Map[String, services.rooms.utils.RoomRuntime]](Map.empty),
            Ref.of[IO, Map[String, services.rooms.objects.Session]](Map.empty),
            resourceText("stages.json").flatMap(raw =>
              IO.fromEither(parser.decode[Vector[Json]](raw))
            ),
            GameLimits.load,
            AdmissionControl.create(config.trustLocalProxy)
          ).mapN((rooms, sessions, stages, limits, admission) =>
            (
              Connection(rooms, sessions, engine, source, stages, limits, config, supervisor),
              admission
            )
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
              // WebSocket headers and payloads must not wait for delayed TCP acknowledgements.
              .withAdditionalSocketOptions(List(SocketOption.noDelay(true)))
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
                  s"Combat runtime: ${engine.getImplementationName} (${engine.getVersion})\nMyGO Scala server: http://localhost:${config.port}\nLAN: open http://<this computer's LAN IP>:${config.port} on both devices."
                ) *>
                  clock
              }
              .guarantee(CloseRoomsMessage().plan(connection))
          }
        }
      }
    }
