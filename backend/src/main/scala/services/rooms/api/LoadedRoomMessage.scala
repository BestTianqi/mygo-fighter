package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json

import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, Simulation}

final case class LoadedRoomMessage(session: Session, generation: Int, peerId: String)
    extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        IO.raiseUnless(
          (state.phase == RoomPhase.Preparing || state.phase == RoomPhase.Playing) && state.generation == generation
        )(
          IllegalArgumentException("准备状态已过期")
        ) *>
          room.peers.get.flatMap(peers =>
            IO.raiseUnless(peers.get(session.side).exists(_.id == peerId))(
              IllegalArgumentException("连接已更新，请等待当前页面加载完成")
            )
          ) *>
          room.state.update(s => s.copy(loaded = s.loaded + session.side)) *>
          room.state.get.flatMap { next =>
            if next.phase == RoomPhase.Playing || next.loaded.size != next.players.size then
              room.broadcast
            else
              val config = next.config.getOrElse(Json.Null)
              val options = config.deepMerge(
                Json.obj(
                  "terrain" -> (if next.terrain then
                                  connection
                                    .stages(next.arena)
                                    .hcursor
                                    .downField("terrain")
                                    .focus
                                    .getOrElse(Json.Null)
                                else Json.Null)
                )
              )
              Simulation
                .create(connection.simulationEngine, connection.simulationSource, options)
                .flatMap { engine =>
                  room.simulation.set(Some(engine)) *> room.state.update(
                    _.copy(phase = RoomPhase.Playing)
                  ) *> IO.monotonic.flatMap(room.lastTick.set) *> room.broadcast
                }
          }
      }
    }
