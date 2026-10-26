package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, RoomDraft}
import services.system.api.APIMessage
import services.system.objects.Connection

final case class ChooseRoomMessage(
    session: Session,
    character: Option[Int],
    arena: Option[Int],
    terrain: Option[Boolean],
    format: Option[String],
    team: Option[Vector[Int]],
    draft: Option[Boolean],
    ban: Option[Int],
    pick: Option[Int]
) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        val nextFormat = format.getOrElse(state.format)
        val size = if nextFormat == "3v3" then 3 else 1
        val hasDraftAction = ban.nonEmpty || pick.nonEmpty
        val hasSettings = arena.nonEmpty || terrain.nonEmpty || format.nonEmpty || draft.nonEmpty
        val hasSelection = character.nonEmpty || team.nonEmpty
        IO.raiseUnless(Set("1v1", "3v3").contains(nextFormat))(
          IllegalArgumentException("对战模式无效")
        ) *>
          IO.raiseUnless(
            team.forall(t =>
              t.nonEmpty && t.size <= size && t.distinct.size == t.size && t.forall(n =>
                n >= 0 && n < connection.limits.characters
              )
            )
          )(IllegalArgumentException("请选择不重复的有效角色")) *>
          IO.raiseUnless(character.isEmpty || team.isEmpty)(
            IllegalArgumentException("请只提交角色或队伍")
          ) *>
          IO.raiseUnless(
            !hasDraftAction || (ban.isEmpty || pick.isEmpty) && !hasSettings && !hasSelection
          )(
            IllegalArgumentException("请每次只提交一个禁用或选人操作")
          ) *>
          IO.raiseUnless(!draft.contains(true) || nextFormat == "3v3")(
            IllegalArgumentException("禁选仅适用于3v3车轮战")
          ) *>
          IO.raiseWhen(hasSelection && (state.draft.nonEmpty || draft.contains(true)))(
            IllegalArgumentException("禁选模式请按顺序确认角色")
          ) *>
          IO.raiseUnless(state.phase == RoomPhase.Lobby)(IllegalArgumentException("请先返回房间再选人")) *>
          IO.raiseUnless(
            character.forall(n => n >= 0 && n < connection.limits.characters) && arena.forall(n =>
              n >= 0 && n < connection.limits.stages
            )
          )(IllegalArgumentException("角色或地图编号无效")) *>
          IO.raiseWhen(
            session.side != 0 && hasSettings
          )(
            IllegalArgumentException("只有房主可以选择模式和地图")
          ) *>
          (if hasDraftAction then
             IO.fromEither(
               RoomDraft.choose(
                 state,
                 session.side,
                 ban.orElse(pick).get,
                 ban.nonEmpty,
                 connection.limits.characters
               )
             )
           else
             IO.pure {
               val next = state.copy(
                 format = nextFormat,
                 draft =
                   if nextFormat != "3v3" || draft.contains(false) then None
                   else if draft.contains(true) then Some(DraftState())
                   else state.draft,
                 players = state.players.zipWithIndex.map((p, i) =>
                   p.map(player =>
                     player.copy(
                       character =
                         if i == session.side then
                           team.flatMap(_.headOption).orElse(character).getOrElse(player.character)
                         else player.character,
                       team = (if i == session.side then
                                 team.orElse(character.map(Vector(_))).getOrElse(player.team)
                               else player.team).take(size)
                     )
                   )
                 ),
                 arena = arena.getOrElse(state.arena),
                 terrain = terrain.getOrElse(state.terrain)
               )
               if draft.contains(true) then RoomDraft.reset(next) else next
             }
          ).flatMap(next =>
            room.state.set(
              next.copy(
                generation = state.generation + 1,
                players = next.players.map(_.map(_.copy(ready = false)))
              )
            )
          ) *> room.broadcast
      }
    }
