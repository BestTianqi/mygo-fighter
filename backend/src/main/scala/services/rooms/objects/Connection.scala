package services.rooms.objects

import cats.effect.{IO, Ref}
import cats.effect.std.Supervisor
import io.circe.Json
import org.graalvm.polyglot.{Engine, Source}
import services.rooms.utils.{LobbyClient, RoomRuntime}

/** Application resources for one rooms process. The combat kernel, room table and session table are
  * process-local by design: the 120 Hz tick loop never crosses a network boundary.
  */
final case class Connection(
    rooms: Ref[IO, Map[String, RoomRuntime]],
    sessions: Ref[IO, Map[String, Session]],
    simulationEngine: Engine,
    simulationSource: Source,
    stages: Vector[Json],
    limits: GameLimits,
    config: RoomsConfig,
    lobby: Option[LobbyClient],
    roomSupervisor: Supervisor[IO]
)
