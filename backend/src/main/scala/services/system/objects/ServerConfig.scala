package services.system.objects

final case class ServerConfig(host: String, port: Int, webRoot: String, maxRooms: Int = 20)
