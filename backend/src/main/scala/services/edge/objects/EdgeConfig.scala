package services.edge.objects

import cats.effect.IO

/** Public edge configuration. `LOBBY_URL` is optional: without it edge routes to
  * `ROOMS_DIRECT_URL`.
  */
final case class EdgeConfig(
    host: String,
    port: Int,
    webRoot: String,
    lobbyUrl: Option[String],
    roomsDirectUrl: Option[String],
    roomCacheTtlMs: Int,
    ownerLookupTimeoutMs: Int,
    forwardTimeoutMs: Int,
    wsQueueFrames: Int,
    trustLocalProxy: Boolean,
    internalSecret: Option[String]
)

object EdgeConfig:
  def load: IO[EdgeConfig] = IO {
    val port = int("PORT", 8080)
    val roomCacheTtlMs = int("ROOM_CACHE_TTL_MS", 3000)
    val ownerLookupTimeoutMs = int("OWNER_LOOKUP_TIMEOUT_MS", 300)
    val forwardTimeoutMs = int("FORWARD_TIMEOUT_MS", 10000)
    val wsQueueFrames = int("WS_QUEUE_FRAMES", 64)
    require(port >= 1 && port <= 65535, "PORT must be between 1 and 65535")
    require(roomCacheTtlMs >= 250, "ROOM_CACHE_TTL_MS must be at least 250")
    require(ownerLookupTimeoutMs >= 50, "OWNER_LOOKUP_TIMEOUT_MS must be at least 50")
    require(forwardTimeoutMs >= 1000, "FORWARD_TIMEOUT_MS must be at least 1000")
    require(wsQueueFrames >= 8, "WS_QUEUE_FRAMES must be at least 8")
    EdgeConfig(
      sys.env.getOrElse("HOST", "0.0.0.0"),
      port,
      sys.env.getOrElse("WEB_ROOT", "../frontend/dist"),
      optional("LOBBY_URL"),
      optional("ROOMS_DIRECT_URL"),
      roomCacheTtlMs,
      ownerLookupTimeoutMs,
      forwardTimeoutMs,
      wsQueueFrames,
      sys.env.get("TRUST_LOCAL_PROXY").contains("true"),
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
