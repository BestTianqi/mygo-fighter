package services.rooms.objects

import io.circe.{Decoder, Encoder, Json}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** The wire boundary only accepts finite action names, booleans and bounded counters. */
final case class PlayerInput(seq: Long, input: Json)

object PlayerInput:
  val actions: Vector[String] = Vector(
    "left",
    "right",
    "jump",
    "crouch",
    "light",
    "heavy",
    "blink",
    "skill1",
    "skill2",
    "skill3",
    "transform",
    "super"
  )
  private val directions = Vector("left", "right", "jump", "crouch")

  def sanitize(json: Json): Either[String, PlayerInput] =
    val cursor = json.hcursor
    cursor.get[Long]("seq").left.map(_.message).flatMap { seq =>
      if seq < 0 || seq > 9007199254740991L then Left("Invalid input sequence")
      else
        val input = cursor.downField("input")
        val values = actions
          .filter(action => input.get[Boolean](action).getOrElse(false))
          .map(action => action -> Json.True)
        val ids = actions.flatMap(action =>
          input
            .downField("pressIds")
            .get[Long](action)
            .toOption
            .filter(n => n > 0 && n <= 9007199254740991L)
            .map(n => action -> Json.fromLong(n))
        )
        val gestures = actions
          .filter(action => input.downField("pressDirections").downField(action).succeeded)
          .map { action =>
            action -> Json.obj(
              directions
                .filter(direction =>
                  input
                    .downField("pressDirections")
                    .downField(action)
                    .get[Boolean](direction)
                    .getOrElse(false)
                )
                .map(direction => direction -> Json.True)*
            )
          }
        Right(
          PlayerInput(
            seq,
            Json.obj(
              (values ++ Vector(
                "unified" -> Json.True,
                "touchLight" -> Json.fromBoolean(input.get[Boolean]("touchLight").getOrElse(false)),
                "pressIds" -> Json.obj(ids*),
                "pressDirections" -> Json.obj(gestures*)
              ))*
            )
          )
        )
    }

  given Encoder[PlayerInput] = deriveEncoder
  given Decoder[PlayerInput] = deriveDecoder
