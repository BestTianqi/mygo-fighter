package services.rooms.objects

import cats.effect.IO

/** Runtime configuration for one rooms process; values are validated before the server starts. */
final case class RoomsConfig(
    host: String,
    port: Int,
    instanceId: String,
    instanceUrl: String,
    maxRooms: Int,
    lobbyUrl: Option[String],
    heartbeatIntervalMs: Int,
    internalSecret: Option[String]
)

object RoomsConfig:
  def load: IO[RoomsConfig] = IO {
    val host = sys.env.getOrElse("ROOMS_HOST", "127.0.0.1")
    val port = int("ROOMS_PORT", 8091)
    val instanceId = sys.env.getOrElse("INSTANCE_ID", "a")
    val maxRooms = int("MAX_ROOMS", 20)
    val heartbeatIntervalMs = int("HEARTBEAT_INTERVAL_MS", 2000)
    require(port >= 1 && port <= 65535, "ROOMS_PORT must be between 1 and 65535")
    require(maxRooms > 0, "MAX_ROOMS must be a positive integer")
    require(heartbeatIntervalMs >= 250, "HEARTBEAT_INTERVAL_MS must be at least 250")
    require(
      instanceId.matches("[a-z0-9][a-z0-9-]*"),
      "INSTANCE_ID must contain lowercase letters, digits or dashes"
    )
    RoomsConfig(
      host,
      port,
      instanceId,
      sys.env.getOrElse("INSTANCE_URL", s"http://$host:$port"),
      maxRooms,
      optional("LOBBY_URL"),
      heartbeatIntervalMs,
      optional("INTERNAL_SECRET")
    )
  }

  private def optional(name: String): Option[String] =
    sys.env.get(name).map(_.trim).filter(_.nonEmpty)

  private def int(name: String, default: Int): Int =
    sys.env.get(name) match
      case None      => default
      case Some(raw) =>
        raw.trim.toIntOption.getOrElse(
          throw IllegalArgumentException(s"$name must be an integer")
        )
