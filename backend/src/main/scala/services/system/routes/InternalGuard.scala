package services.system.routes

import cats.data.{Kleisli, OptionT}
import cats.effect.IO
import io.circe.Json
import io.circe.syntax.*
import org.http4s.circe.jsonEncoder
import org.http4s.{HttpRoutes, Request, Response}
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString

/** Internal service endpoints are loopback-only. When a shared secret is configured, the caller
  * must also present it; a caller cannot reach an internal endpoint through the public edge port.
  */
object InternalGuard:
  private val Loopback = Set("127.0.0.1", "::1", "0:0:0:0:0:0:0:1", "::ffff:127.0.0.1")

  private def trusted(request: Request[IO], secret: Option[String]): Boolean =
    val remote = request.remoteAddr.fold("")(_.toString)
    Loopback.contains(remote) && secret.forall(expected =>
      request.headers.get(CIString("X-Mygo-Internal")).exists(_.head.value == expected)
    )

  def wrap(secret: Option[String])(routes: HttpRoutes[IO]): HttpRoutes[IO] =
    Kleisli { request =>
      if trusted(request, secret) then routes.run(request)
      else
        OptionT.liftF[IO, Response[IO]](
          Forbidden(Json.obj("error" -> "内部接口不允许外部访问".asJson))
        )
    }
