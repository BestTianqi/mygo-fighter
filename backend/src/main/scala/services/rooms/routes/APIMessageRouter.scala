package services.rooms.routes

import cats.effect.IO
import io.circe.syntax.*
import io.circe.{parser, Json}
import org.http4s.HttpRoutes
import org.http4s.dsl.io.*
import org.http4s.circe.*
import services.rooms.objects.Connection
import services.system.routes.OriginCheck

/** Dispatches `POST /api/{name}` to the registered public room message. */
object APIMessageRouter:
  def routes(registrations: Vector[APIRegistration], connection: Connection): HttpRoutes[IO] =
    val apis = registrations.map(api => api.name -> api).toMap
    HttpRoutes.of[IO] { case request @ POST -> Root / "api" / name =>
      if !OriginCheck.sameOrigin(request) then Forbidden(Json.obj("error" -> "请从联机服务页面进入".asJson))
      else
        apis.get(name).fold(NotFound()) { api =>
          request.body
            .take(8193)
            .compile
            .toVector
            .flatMap { bytes =>
              if bytes.size > 8192 then PayloadTooLarge()
              else
                IO.fromEither(
                  parser.parse(new String(bytes.toArray, java.nio.charset.StandardCharsets.UTF_8))
                ).flatMap(api.run(_, connection))
                  .flatMap(Ok(_))
            }
            .handleErrorWith(error =>
              BadRequest(Json.obj("error" -> Option(error.getMessage).getOrElse("请求无效").asJson))
            )
        }
    }
