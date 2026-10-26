package services.rooms.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

import io.circe.Json

final case class RoomState(
    code: String,
    players: Vector[Option[Player]],
    format: String = "1v1",
    arena: Int = 0,
    terrain: Boolean = true,
    generation: Int = 0,
    phase: RoomPhase = RoomPhase.Lobby,
    loaded: Set[Int] = Set.empty,
    config: Option[Json] = None,
    draft: Option[DraftState] = None
)

object RoomState:
  given Encoder[RoomState] = deriveEncoder
  given Decoder[RoomState] = deriveDecoder
