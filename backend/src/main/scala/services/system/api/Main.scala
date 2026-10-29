package services.system.api

import cats.effect.{IO, IOApp}
import cats.syntax.all.*
import services.edge.api.EdgeMain
import services.edge.objects.EdgeConfig
import services.lobby.api.LobbyMain
import services.lobby.objects.LobbyConfig
import services.rooms.api.RoomsMain
import services.rooms.objects.RoomsConfig

/** One artifact, three roles. Production runs `SERVICE_ROLE=edge|lobby|rooms` as separate units;
  * `all` composes the same role servers behind loopback for local debugging and latency comparison.
  */
object Main extends IOApp.Simple:
  def run: IO[Unit] =
    IO(sys.env.getOrElse("SERVICE_ROLE", "all").trim.toLowerCase(java.util.Locale.ROOT))
      .flatMap {
        case "edge"  => EdgeConfig.load.flatMap(EdgeMain.resource(_).useForever)
        case "lobby" => LobbyConfig.load.flatMap(LobbyMain.resource(_).useForever)
        case "rooms" => RoomsConfig.load.flatMap(RoomsMain.resource(_).useForever)
        case "all"   => all()
        case other   =>
          IO.raiseError(IllegalArgumentException(s"Unsupported SERVICE_ROLE: $other"))
      }

  private def all(): IO[Unit] =
    (RoomsConfig.load, LobbyConfig.load, EdgeConfig.load).tupled.flatMap { (rooms, lobby, edge) =>
      val lobbyUrl = s"http://${lobby.host}:${lobby.port}"
      (
        LobbyMain.resource(lobby) *>
          RoomsMain.resource(
            rooms.copy(lobbyUrl = rooms.lobbyUrl.orElse(Some(lobbyUrl)))
          ) *>
          EdgeMain.resource(
            edge.copy(
              lobbyUrl = edge.lobbyUrl.orElse(Some(lobbyUrl)),
              roomsDirectUrl =
                edge.roomsDirectUrl.orElse(Some(s"http://${rooms.host}:${rooms.port}"))
            )
          )
      ).useForever
    }
