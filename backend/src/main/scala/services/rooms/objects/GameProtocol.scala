package services.rooms.objects

/** Websocket handshake version; the frontend mirror is checked by scripts/check-protocol.mjs. */
object GameProtocol:
  val Version: Int = 10
