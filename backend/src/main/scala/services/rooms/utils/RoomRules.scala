package services.rooms.utils

import services.rooms.objects.BattleRules

object RoomRules:
  private[rooms] def teamSize(format: String): Int =
    format.take(1).toIntOption.getOrElse(0)

  private[rooms] def validate(
      format: String,
      rules: BattleRules,
      characterCount: Int
  ): Either[IllegalArgumentException, Unit] =
    val size = teamSize(format)
    val maxBans = math.min(7, math.max(0, (characterCount - 2 * size) / 2))
    if size < 1 || size > 8 || format != s"${size}v$size" then
      Left(IllegalArgumentException("对战模式无效"))
    else if rules.maxHealth < 50 || rules.maxHealth > 2000 then
      Left(IllegalArgumentException("生命值必须为50至2000"))
    else if rules.banCount < 0 || rules.banCount > maxBans then
      Left(IllegalArgumentException(s"当前阵容每人最多禁用${maxBans}名角色"))
    else if rules.roundSeconds < 30 || rules.roundSeconds > 300 then
      Left(IllegalArgumentException("回合时间必须为30至300秒"))
    else if rules.initialEnergy < 0 || rules.initialEnergy > 100 then
      Left(IllegalArgumentException("初始能量必须为0至100"))
    else if !Set(0.5d, 1d, 1.5d, 2d, 3d).contains(rules.damageMultiplier) then
      Left(IllegalArgumentException("伤害倍率无效"))
    else if !Set(0.75d, 1d, 1.25d, 1.5d, 2d).contains(rules.speedMultiplier) then
      Left(IllegalArgumentException("对战速度无效"))
    else Right(())
