package services.edge.utils

import cats.data.Kleisli
import cats.effect.{IO, Ref}
import com.comcast.ip4s.IpAddress
import io.circe.Json
import org.http4s.{Header, HttpApp, Method, Request}
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import scala.concurrent.duration.*

/** Bounded, per-client admission counters. Established sockets retain their own input limits. */
private[edge] final class AdmissionControl private (
    counters: Ref[IO, Map[(String, String), (FiniteDuration, Int)]],
    trustLocalProxy: Boolean
):
  private[edge] def client(request: Request[IO]): String =
    val remote = request.remoteAddr.fold("unknown")(_.toString)
    if trustLocalProxy && Set("127.0.0.1", "::1", "::ffff:127.0.0.1").contains(remote) then
      request.headers
        .get(CIString("X-Forwarded-For"))
        .flatMap(_.head.value.split(",").lastOption)
        .flatMap(value => IpAddress.fromString(value.trim))
        .fold(remote)(_.toString)
    else remote

  private[edge] def wrap(app: HttpApp[IO]): HttpApp[IO] = Kleisli { request =>
    val admission = (request.method, request.uri.path.segments.map(_.decoded()).toList) match
      case (Method.POST, List("api", "createroom" | "joinroom")) => Some(("rooms", 20))
      case (Method.GET, List("ws"))                              => Some(("sockets", 60))
      case _                                                     => None
    admission.fold(app(request)) { (category, limit) =>
      IO.monotonic.flatMap { now =>
        counters
          .modify { previous =>
            val current = previous.filter { case (_, (start, _)) => now - start < 1.minute }
            val key = (client(request), category)
            val (start, count) = current.getOrElse(key, (now, 0))
            if count >= limit || (!current.contains(key) && current.size >= 4096) then
              (current, false)
            else (current.updated(key, (start, count + 1)), true)
          }
          .flatMap { allowed =>
            if allowed then app(request)
            else
              TooManyRequests(Json.obj("error" -> Json.fromString("连接请求过于频繁，请稍后重试（最多一分钟）。")))
                .map(_.putHeaders(Header.Raw(CIString("Retry-After"), "60")))
          }
      }
    }
  }

private[edge] object AdmissionControl:
  private[edge] def create(trustLocalProxy: Boolean): IO[AdmissionControl] =
    Ref
      .of[IO, Map[(String, String), (FiniteDuration, Int)]](Map.empty)
      .map(new AdmissionControl(_, trustLocalProxy))
