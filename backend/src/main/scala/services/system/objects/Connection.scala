package services.system.objects

import cats.effect.{IO, Ref}
import io.circe.Json
import org.graalvm.polyglot.{Engine, Source}
import cats.effect.std.Supervisor
import services.rooms.objects.{GameLimits, Session}
import services.rooms.utils.RoomRuntime

/** Application resources. Rooms are ephemeral; there is no database connection to inject. */
final case class Connection(
    rooms: Ref[IO, Map[String, RoomRuntime]],
    sessions: Ref[IO, Map[String, Session]],
    simulationEngine: Engine,
    simulationSource: Source,
    stages: Vector[Json],
    limits: GameLimits,
    config: ServerConfig,
    roomSupervisor: Supervisor[IO]
)
