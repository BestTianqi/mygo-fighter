package services.rooms.objects

import io.circe.{Decoder, Encoder}

enum RoomPhase:
  case Lobby, Preparing, Playing

object RoomPhase:
  def toString(value: RoomPhase): String = value match
    case RoomPhase.Lobby     => "lobby"
    case RoomPhase.Preparing => "preparing"
    case RoomPhase.Playing   => "playing"

  def fromString(value: String): Either[String, RoomPhase] =
    value.trim.toLowerCase(java.util.Locale.ROOT) match
      case "lobby"     => Right(RoomPhase.Lobby)
      case "preparing" => Right(RoomPhase.Preparing)
      case "playing"   => Right(RoomPhase.Playing)
      case other       => Left(s"Unsupported room phase: $other")

  given Encoder[RoomPhase] = Encoder.encodeString.contramap(toString)
  given Decoder[RoomPhase] = Decoder.decodeString.emap(fromString)
