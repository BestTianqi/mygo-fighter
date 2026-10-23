package services.system.routes

import cats.effect.IO
import io.circe.Json
import io.circe.syntax.*
import org.http4s.HttpRoutes
import org.http4s.dsl.io.*
import org.http4s.circe.*

object SystemRoutes:
  val routes: HttpRoutes[IO] = HttpRoutes.of[IO] { case GET -> Root / "api" / "health" =>
    Ok(
      Json.obj(
        "app" -> "mygo-scala".asJson,
        "ok" -> true.asJson,
        "tickHz" -> 120.asJson,
        "snapshotHz" -> 60.asJson
      )
    )
  }
