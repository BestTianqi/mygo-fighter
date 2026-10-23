package services.system.routes

import cats.effect.IO
import io.circe.{parser, Json}
import io.circe.syntax.*
import org.http4s.{HttpRoutes, Request}
import org.http4s.dsl.io.*
import org.http4s.circe.*
import org.typelevel.ci.CIString
import services.system.objects.Connection

object APIMessageRouter:
  def sameOrigin(request: Request[IO]): Boolean =
    request.headers.get(CIString("Origin")).forall { origin =>
      scala.util
        .Try(java.net.URI.create(origin.head.value).getAuthority)
        .toOption
        .exists(authority =>
          request.headers.get(CIString("Host")).exists(_.head.value == authority)
        )
    }

  def routes(registrations: Vector[APIRegistration], connection: Connection): HttpRoutes[IO] =
    val apis = registrations.map(api => api.name -> api).toMap
    HttpRoutes.of[IO] { case request @ POST -> Root / "api" / name =>
      if !sameOrigin(request) then Forbidden(Json.obj("error" -> "请从联机服务页面进入".asJson))
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
