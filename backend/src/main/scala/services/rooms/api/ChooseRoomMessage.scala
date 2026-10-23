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
    terrain: Option[Boolean],
    format: Option[String],
    team: Option[Vector[Int]]
) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        val nextFormat = format.getOrElse(state.format)
        val size = if nextFormat == "3v3" then 3 else 1
        IO.raiseUnless(Set("1v1", "3v3").contains(nextFormat))(
          IllegalArgumentException("对战模式无效")
        ) *>
          IO.raiseUnless(
            team.forall(t =>
              t.nonEmpty && t.size <= size && t.distinct.size == t.size && t.forall(n =>
                n >= 0 && n < 15
              )
            )
          )(IllegalArgumentException("请选择不重复的有效角色")) *>
          IO.raiseUnless(character.isEmpty || team.isEmpty)(
            IllegalArgumentException("请只提交角色或队伍")
          ) *>
          IO.raiseUnless(state.phase == RoomPhase.Lobby)(IllegalArgumentException("请先返回房间再选人")) *>
          IO.raiseUnless(
            character.forall(n => n >= 0 && n < 15) && arena.forall(n =>
              n >= 0 && n < connection.stages.size
            )
          )(IllegalArgumentException("角色或地图编号无效")) *>
          IO.raiseWhen(
            session.side != 0 && (arena.nonEmpty || terrain.nonEmpty || format.nonEmpty)
          )(
            IllegalArgumentException("只有房主可以选择模式和地图")
          ) *>
          room.state.update(s =>
            s.copy(
              format = nextFormat,
              players = s.players.zipWithIndex.map((p, i) =>
                p.map(player =>
                  player.copy(
                    character =
                      if i == session.side then
                        team.flatMap(_.headOption).orElse(character).getOrElse(player.character)
                      else player.character,
                    team = (if i == session.side then
                              team.orElse(character.map(Vector(_))).getOrElse(player.team)
                            else player.team).take(size),
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
