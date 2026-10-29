package services.rooms.api

import cats.effect.{IO, Ref, Resource}
import cats.effect.std.Supervisor
import cats.syntax.all.*
import com.comcast.ip4s.*
import fs2.Stream
import fs2.io.net.SocketOption
import io.circe.{parser, Json}
import org.graalvm.polyglot.{Engine, Source}
import org.http4s.ember.server.EmberServerBuilder
import scala.concurrent.duration.*
import services.rooms.objects.*
import services.rooms.routes.RoomInternalRoutes
import services.rooms.utils.{LobbyClient, RoomRuntime}
import services.system.objects.internal.{InstanceSummary, RoomSummary}

/** One rooms process. Room state, sessions and the authoritative combat kernel never leave this
  * process; the only outbound calls are directory heartbeats, outside the 120 Hz tick loop.
  */
object RoomsMain:
  def resource(config: RoomsConfig): Resource[IO, Unit] =
    simulationRuntime.flatMap { (engine, source) =>
      Supervisor[IO].flatMap { supervisor =>
        (
          Ref.of[IO, Map[String, RoomRuntime]](Map.empty),
          Ref.of[IO, Map[String, Session]](Map.empty),
          resourceText("stages.json").flatMap(raw =>
            IO.fromEither(parser.decode[Vector[Json]](raw))
          ),
          GameLimits.load
        ).mapN((rooms, sessions, stages, limits) =>
          Connection(
            rooms,
            sessions,
            engine,
            source,
            stages,
            limits,
            config,
            LobbyClient.create(config),
            supervisor
          )
        ).toResource
          .flatMap { connection =>
            Resource.eval(
              IO.println(
                s"Rooms instance ${config.instanceId}: http://${config.host}:${config.port}" +
                  config.lobbyUrl.fold(" (no lobby)")(url => s", lobby $url")
              )
            ) *> background(connection) *> server(connection)
          }
      }
    }

  private def server(connection: Connection): Resource[IO, Unit] =
    EmberServerBuilder
      .default[IO]
      .withHost(Host.fromString(connection.config.host).getOrElse(host"127.0.0.1"))
      .withPort(Port.fromInt(connection.config.port).getOrElse(port"8091"))
      .withAdditionalSocketOptions(List(SocketOption.noDelay(true)))
      .withHttpWebSocketApp(builder => RoomInternalRoutes.routes(connection, builder).orNotFound)
      .build
      .void
      .onFinalize(
        CloseRoomsMessage()
          .plan(connection)
          .handleErrorWith(error => IO.println(s"Rooms shutdown cleanup failed: $error"))
      )

  private def background(connection: Connection): Resource[IO, Unit] =
    val tick = Stream
      .awakeEvery[IO](1.second)
      .evalMap(_ =>
        TickRoomsMessage()
          .plan(connection)
          .handleErrorWith(error => IO.println(s"Room clock failed: $error"))
      )
    val heartbeat = connection.lobby match
      case None        => Stream.empty
      case Some(lobby) =>
        def report: IO[Unit] =
          connection.rooms.get.flatMap { rooms =>
            rooms.values.toList
              .traverse { room =>
                room.state.get.map(state => RoomSummary(state.code, state.players.flatten.size))
              }
              .map(_.toVector)
              .flatMap(summary =>
                lobby.heartbeat(
                  InstanceSummary(
                    connection.config.instanceId,
                    connection.config.instanceUrl,
                    connection.config.maxRooms,
                    summary
                  )
                )
              )
          }
        // Register before the first interval so a freshly started instance is placeable at once.
        Stream.eval(report) ++
          Stream
            .awakeEvery[IO](connection.config.heartbeatIntervalMs.millis)
            .evalMap(_ => report)
    Resource
      .make(connection.roomSupervisor.supervise(tick.merge(heartbeat).compile.drain))(_.cancel)
      .void

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
