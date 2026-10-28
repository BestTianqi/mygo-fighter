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
    else Right(())
