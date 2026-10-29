package services.lobby.objects

import cats.effect.{IO, Ref}
import cats.effect.std.Semaphore

/** Application resources for the lobby process. Heartbeats refresh `instances`, `directory` is the
  * code-to-instance view used for joins, and `reservations` holds freshly placed codes against the
  * global room budget until a rooms instance confirms them.
  */
final case class LobbyConnection(
    config: LobbyConfig,
    instances: Ref[IO, Map[String, InstanceRecord]],
    directory: Ref[IO, Map[String, String]],
    reservations: Ref[IO, Map[String, Reservation]],
    placementLock: Semaphore[IO]
)
