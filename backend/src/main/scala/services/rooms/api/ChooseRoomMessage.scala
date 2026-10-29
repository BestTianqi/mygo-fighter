package services.rooms.api

import cats.effect.IO
import cats.syntax.all.*

import services.rooms.objects.*
import services.rooms.utils.{RoomAccess, RoomDraft, RoomRules}

final case class ChooseRoomMessage(
    session: Session,
    character: Option[Int],
    arena: Option[Int],
    terrain: Option[Boolean],
    format: Option[String],
    team: Option[Vector[Int]],
    draft: Option[Boolean],
    ban: Option[Int],
    pick: Option[Int],
    rules: Option[BattleRules]
) extends APIMessage[Unit]:
  def plan(connection: Connection): IO[Unit] =
    RoomAccess.withPlayer(connection, session) { room =>
      room.state.get.flatMap { state =>
        val nextFormat = format.getOrElse(state.format)
        val size = RoomRules.teamSize(nextFormat)
        val selectedRules = rules.getOrElse(
          draft.fold(state.rules)(enabled => state.rules.copy(banCount = if enabled then 1 else 0))
        )
        val nextRules =
          if nextFormat == "3ffa" then selectedRules.copy(banCount = 0) else selectedRules
        val nextDraft = nextRules.banCount > 0
        val draftLayoutChanged =
          nextFormat != state.format || nextRules.banCount != state.rules.banCount
        val hasDraftAction = ban.nonEmpty || pick.nonEmpty
        val hasSettings =
          arena.nonEmpty || terrain.nonEmpty || format.nonEmpty || draft.nonEmpty || rules.nonEmpty
        val hasSelection = character.nonEmpty || team.nonEmpty
        IO.fromEither(RoomRules.validate(nextFormat, nextRules, connection.limits.characters)) *>
          IO.raiseWhen(state.players.drop(RoomRules.playerCount(nextFormat)).exists(_.nonEmpty))(
            IllegalArgumentException("请等待第三名玩家离开后再切换双人模式")
          ) *>
          IO.raiseWhen(rules.nonEmpty && draft.exists(_ != nextDraft))(
            IllegalArgumentException("禁选开关与禁用人数不一致")
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
          IO.raiseWhen(hasSelection && nextDraft)(
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
            IllegalArgumentException("只有房主可以选择对战规则和地图")
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
                 rules = nextRules,
                 draft = if nextDraft then state.draft.orElse(Some(DraftState())) else None,
                 players = state.players
                   .padTo(RoomRules.playerCount(nextFormat), None)
                   .take(RoomRules.playerCount(nextFormat))
                   .zipWithIndex
                   .map((p, i) =>
                     p.map(player =>
                       player.copy(
                         character =
                           if i == session.side then
                             team
                               .flatMap(_.headOption)
                               .orElse(character)
                               .getOrElse(player.character)
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
               if draft.contains(true) || draftLayoutChanged && (state.draft.nonEmpty || nextDraft)
               then RoomDraft.reset(next)
               else next
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
