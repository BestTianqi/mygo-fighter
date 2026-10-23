package services.system.routes

import cats.effect.IO
import org.http4s.{Header, HttpRoutes, StaticFile}
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import fs2.io.file.Path

object StaticRoutes:
  def routes(webRoot: String): HttpRoutes[IO] =
    val root = java.nio.file.Paths.get(webRoot).toAbsolutePath.normalize
    HttpRoutes.of[IO] { case request @ GET -> _ =>
      val relative = request.uri.path.segments.map(_.decoded()).mkString("/")
      val path = root.resolve(if relative.isEmpty then "index.html" else relative).normalize
      if !path.startsWith(root) || relative.startsWith("api/") || relative == "ws" then NotFound()
      else
        StaticFile.fromPath(Path.fromNioPath(path), Some(request)).getOrElseF(NotFound()).map {
          response =>
            val cache =
              if relative.startsWith("media/") || relative.startsWith("assets/") then
                "public, max-age=31536000, immutable"
              else "no-cache"
            response.putHeaders(
              Header.Raw(CIString("Cache-Control"), cache),
              Header.Raw(CIString("X-Content-Type-Options"), "nosniff")
            )
        }
    }
