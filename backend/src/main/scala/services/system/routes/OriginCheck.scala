package services.system.routes

import org.http4s.Request
import org.typelevel.ci.CIString
import scala.util.Try

/** Same-origin check shared by the public edge and the rooms socket handshake. */
object OriginCheck:
  def sameOrigin[F[_]](request: Request[F]): Boolean =
    request.headers.get(CIString("Origin")).forall { origin =>
      Try(java.net.URI.create(origin.head.value).getAuthority).toOption
        .exists(authority =>
          request.headers.get(CIString("Host")).exists(_.head.value == authority)
        )
    }
