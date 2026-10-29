package services.lobby.objects

import cats.effect.IO

/** Directory and placement service configuration; the only service that owns a global room count.
  */
final case class LobbyConfig(
    host: String,
    port: Int,
    maxRooms: Int,
    roomsPerInstance: Int,
    instanceTtlMs: Int,
    reservationTtlMs: Int,
    internalSecret: Option[String]
)

object LobbyConfig:
  def load: IO[LobbyConfig] = IO {
    val host = sys.env.getOrElse("LOBBY_HOST", "127.0.0.1")
    val port = int("LOBBY_PORT", 8079)
    val maxRooms = int("MAX_ROOMS", 20)
    val roomsPerInstance = int("ROOMS_PER_INSTANCE", maxRooms)
    val instanceTtlMs = int("INSTANCE_TTL_MS", 6000)
    val reservationTtlMs = int("RESERVATION_TTL_MS", 10000)
    require(port >= 1 && port <= 65535, "LOBBY_PORT must be between 1 and 65535")
    require(maxRooms > 0, "MAX_ROOMS must be a positive integer")
    require(
      roomsPerInstance > 0 && roomsPerInstance <= maxRooms,
      "ROOMS_PER_INSTANCE must be positive and no larger than MAX_ROOMS"
    )
    require(instanceTtlMs >= 2000, "INSTANCE_TTL_MS must be at least 2000")
    require(reservationTtlMs >= 2000, "RESERVATION_TTL_MS must be at least 2000")
    LobbyConfig(
      host,
      port,
      maxRooms,
      roomsPerInstance,
      instanceTtlMs,
      reservationTtlMs,
      sys.env.get("INTERNAL_SECRET").map(_.trim).filter(_.nonEmpty)
    )
  }

  private def int(name: String, default: Int): Int =
    sys.env.get(name) match
      case None      => default
      case Some(raw) =>
        raw.trim.toIntOption.getOrElse(
          throw IllegalArgumentException(s"$name must be an integer")
        )
