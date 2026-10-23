package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json

import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, Simulation}
import services.system.api.APIMessage
import services.system.objects.Connection

final case class LoadedRoomMessage(session: Session, generation: Int) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        IO.raiseUnless(state.phase == RoomPhase.Preparing && state.generation == generation)(
          IllegalArgumentException("准备状态已过期")
        ) *>
          room.state.update(s => s.copy(loaded = s.loaded + session.side)) *>
          room.state.get.flatMap { next =>
            if next.loaded.size != 2 then IO.unit
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
              Simulation.create(connection.simulationSource, options).flatMap { engine =>
                room.simulation.set(Some(engine)) *> room.state.update(
                  _.copy(phase = RoomPhase.Playing)
                ) *> IO.monotonic.flatMap(room.lastTick.set) *> room.broadcast
              }
          }
      }
    }
