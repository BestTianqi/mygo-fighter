package services.edge.routes

import cats.effect.IO
import io.circe.Json
import io.circe.syntax.*
import org.http4s.HttpRoutes
import org.http4s.circe.*
import org.http4s.dsl.io.*
import scala.concurrent.duration.*
import services.edge.utils.InstanceClient

/** Public liveness probe; dependency failures are reported but never fail the endpoint itself. */
object EdgeHealthRoute:
  private val ProbeTimeout = 300.millis

  private[edge] def routes(client: InstanceClient): HttpRoutes[IO] =
    HttpRoutes.of[IO] { case GET -> Root / "api" / "health" =>
      probe(client, client.lobbyUrl, disabled = "disabled")
        .both(probe(client, client.directUrl, disabled = "unknown"))
        .flatMap { case (lobby, rooms) =>
          Ok(
            Json.obj(
              "app" -> "mygo-scala".asJson,
              "ok" -> (lobby != "down" && rooms != "down").asJson,
              "tickHz" -> 120.asJson,
              "snapshotHz" -> 60.asJson,
              "services" -> Json.obj(
                "edge" -> "ok".asJson,
                "lobby" -> lobby.asJson,
                "rooms" -> rooms.asJson
              )
            )
          )
        }
    }

  private def probe(client: InstanceClient, target: Option[String], disabled: String): IO[String] =
    target match
      case None       => IO.pure(disabled)
      case Some(base) =>
        client
          .health(base, ProbeTimeout)
          .map(healthy => if healthy then "ok" else "down")
          .handleErrorWith(_ => IO.pure("down"))
