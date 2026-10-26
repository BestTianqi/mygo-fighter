package services.rooms.objects

import cats.effect.{IO, Resource}
import io.circe.{parser, Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

/** Roster limits generated from the shared kernel registry by scripts/build-simulation.mjs. */
final case class GameLimits(characters: Int, stages: Int)

object GameLimits:
  given Encoder[GameLimits] = deriveEncoder[GameLimits]
  given Decoder[GameLimits] = deriveDecoder[GameLimits]

  /** Reads the build-generated `/roster.json` using the same resource style as Main. */
  def load: IO[GameLimits] =
    Resource
      .fromAutoCloseable(
        IO.fromOption(Option(getClass.getResourceAsStream("/roster.json")))(
          IllegalStateException("Missing /roster.json; run npm run build first")
        )
      )
      .use(stream =>
        IO.blocking(
          new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8)
        ).flatMap(raw => IO.fromEither(parser.decode[GameLimits](raw)))
      )
