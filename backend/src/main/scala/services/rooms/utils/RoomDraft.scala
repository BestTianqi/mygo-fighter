package services.rooms.utils

import services.rooms.objects.*

/** Draft transitions run under the same room lock as selection and readiness. */
object RoomDraft:
  private[rooms] def view(state: RoomState): Option[DraftView] = state.draft.map { draft =>
    val picks = state.players.flatten.map(_.team.size).sum
    val count = RoomRules.playerCount(state.format)
    if draft.bans.size < state.rules.banCount * count then
      DraftView(draft.bans, "ban", Some(draft.bans.size % count))
    else if picks < RoomRules.teamSize(state.format) * count then
      DraftView(draft.bans, "pick", Some(picks % count))
    else DraftView(draft.bans, "complete", None)
  }

  private[rooms] def complete(state: RoomState): Boolean =
    state.draft.isEmpty || view(state).exists(_.phase == "complete")

  private[rooms] def reset(state: RoomState): RoomState = state.copy(
    draft = state.draft.map(_ => DraftState()),
    players = state.players.map(_.map(_.copy(team = Vector.empty, ready = false)))
  )

  private[rooms] def choose(
      state: RoomState,
      side: Int,
      character: Int,
      banning: Boolean,
      characterCount: Int
  ): Either[IllegalArgumentException, RoomState] =
    def require(test: Boolean, message: String): Either[IllegalArgumentException, Unit] =
      Either.cond(test, (), IllegalArgumentException(message))
    for
      draft <- state.draft.toRight(IllegalArgumentException("请先开启禁选模式"))
      _ <- require(state.players.forall(_.exists(_.connected)), "请等待所有玩家连接后再禁选")
      phase = view(state).get
      _ <- require(phase.turn.contains(side), "请等待对方完成当前禁选")
      _ <- require(phase.phase == (if banning then "ban" else "pick"), "当前禁选阶段不允许此操作")
      _ <- require(character >= 0 && character < characterCount, "角色编号无效")
      _ <- require(!draft.bans.contains(character), "该角色已被禁用")
      _ <- require(!state.players.flatten.exists(_.team.contains(character)), "该角色已被选用")
    yield
      if banning then state.copy(draft = Some(draft.copy(bans = draft.bans :+ character)))
      else
        state.copy(players =
          state.players.updated(
            side,
            state.players(side).map { player =>
              val team = player.team :+ character
              player.copy(team = team, character = team.head)
            }
          )
        )
