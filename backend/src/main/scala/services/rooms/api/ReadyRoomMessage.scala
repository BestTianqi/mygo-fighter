package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, RoomDraft, RoomRules}
import services.system.api.APIMessage
import services.system.objects.Connection

final case class ReadyRoomMessage(session: Session, ready: Boolean) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        IO.raiseUnless(state.phase == RoomPhase.Lobby)(IllegalArgumentException("对战正在准备或进行")) *>
          IO.raiseWhen(ready && !RoomDraft.complete(state))(
            IllegalArgumentException("请先完成双方禁用和出战角色的选择")
          ) *>
          IO.raiseWhen(
            ready && !state
              .players(session.side)
              .exists(p =>
                p.connected && p.team.size == RoomRules.teamSize(state.format) &&
                  p.team.distinct.size == p.team.size && p.team
                    .forall(n => n >= 0 && n < connection.limits.characters)
              )
          )(IllegalArgumentException("请先选满不重复的出战角色")) *>
          room.state.update(s =>
            s.copy(players =
              s.players.updated(session.side, s.players(session.side).map(_.copy(ready = ready)))
            )
          ) *>
          room.state.get.flatMap { next =>
            if !next.players.forall(_.exists(p => p.connected && p.ready)) then room.broadcast
            else
              RoomAccess.nonce(4).flatMap { seed =>
                val config = Json.obj(
                  "mode" -> "duel".asJson,
                  "format" -> next.format.asJson,
                  "rules" -> next.rules.asJson,
                  "teams" -> next.players.flatten.map(_.team).asJson,
                  "characters" -> next.players.flatten.map(_.character).asJson,
                  "seed" -> (java.lang.Long.parseLong(seed, 16) % 2147483646L + 1).asJson,
                  "settings" -> Json.obj(
                    "arena" -> next.arena.asJson,
                    "terrain" -> next.terrain.asJson,
                    "difficulty" -> 1.asJson,
                    "sound" -> true.asJson,
                    "dummy" -> "idle".asJson
                  )
                )
                val generation = next.generation + 1
                room.state.update(
                  _.copy(
                    phase = RoomPhase.Preparing,
                    generation = generation,
                    config = Some(config),
                    loaded = Set.empty
                  )
                ) *>
                  room.broadcast *> room.peers.get.flatMap(
                    _.values.toList.traverse_(peer =>
                      peer.send(
                        "prepare",
                        Json.obj(
                          "config" -> config,
                          "generation" -> generation.asJson,
                          "peerId" -> peer.id.asJson
                        )
                      )
                    )
                  )
              }
          }
      }
    }
