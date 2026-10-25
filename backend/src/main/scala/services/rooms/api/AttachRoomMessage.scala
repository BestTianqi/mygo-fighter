package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import org.http4s.websocket.WebSocketFrame
import services.rooms.objects.{RoomPhase, Session}
import services.rooms.utils.{Peer, RoomAccess}
import services.system.api.APIMessage
import services.system.objects.Connection

/** A trusted session may have one active socket. Replacements cannot control its old peer. */
final case class AttachRoomMessage(session: Session, peer: Peer) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.peers.get.flatMap(
        _.get(session.side).traverse_(_.control.tryOffer(WebSocketFrame.Close()).void)
      ) *>
        room.peers.update(_.updated(session.side, peer)) *>
        room.simulation.get.flatMap(_.traverse_(_.pause(true))) *>
        room.state.update(s =>
          s.copy(
            loaded = s.loaded - session.side,
            players =
              s.players.updated(session.side, s.players(session.side).map(_.copy(connected = true)))
          )
        ) *>
        room.broadcast *>
        room.state.get.flatMap { state =>
          state.config.traverse_(config =>
            peer.send(
              "prepare",
              Json.obj(
                "config" -> config,
                "generation" -> state.generation.asJson,
                "peerId" -> peer.id.asJson,
                "resume" -> (state.phase == RoomPhase.Playing).asJson
              )
            )
          )
        }
    }
