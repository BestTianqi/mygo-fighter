package services.system.objects

import cats.effect.{IO, Ref}
import io.circe.Json
import services.rooms.objects.Session
import services.rooms.utils.RoomRuntime

/** Application resources. Rooms are ephemeral; there is no database connection to inject. */
final case class Connection(
    rooms: Ref[IO, Map[String, RoomRuntime]],
    sessions: Ref[IO, Map[String, Session]],
    simulationSource: String,
    stages: Vector[Json],
    config: ServerConfig
)
