package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.RoomAccess
import services.system.api.APIMessage
import services.system.objects.Connection

final case class ChooseRoomMessage(
    session: Session,
    character: Option[Int],
    arena: Option[Int],
    terrain: Option[Boolean]
) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        IO.raiseUnless(state.phase == RoomPhase.Lobby)(IllegalArgumentException("请先返回房间再选人")) *>
          IO.raiseUnless(
            character.forall(n => n >= 0 && n < 15) && arena.forall(n =>
              n >= 0 && n < connection.stages.size
            )
          )(IllegalArgumentException("角色或地图编号无效")) *>
          IO.raiseWhen(session.side != 0 && (arena.nonEmpty || terrain.nonEmpty))(
            IllegalArgumentException("只有房主可以选择地图")
          ) *>
          room.state.update(s =>
            s.copy(
              players = s.players.zipWithIndex.map((p, i) =>
                p.map(player =>
                  player.copy(
                    character =
                      if i == session.side then character.getOrElse(player.character)
                      else player.character,
                    ready = false
                  )
                )
              ),
              arena = arena.getOrElse(s.arena),
              terrain = terrain.getOrElse(s.terrain),
              generation = s.generation + 1
            )
          ) *> room.broadcast
      }
    }
