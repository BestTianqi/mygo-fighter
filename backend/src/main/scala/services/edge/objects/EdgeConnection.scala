package services.edge.objects

import cats.effect.{IO, Resource}
import fs2.Stream
import java.net.http.HttpClient
import java.time.Duration
import scala.concurrent.duration.*
import services.edge.utils.{AdmissionControl, OwnerCache}

/** Resources shared by every edge route: the public configuration, a single JDK HTTP client, the
  * bounded room-owner cache and the per-client admission counters.
  */
private[edge] final case class EdgeConnection(
    config: EdgeConfig,
    httpClient: HttpClient,
    owners: OwnerCache,
    admission: AdmissionControl
)

private[edge] object EdgeConnection:
  private val ConnectTimeout = 1.second
  private val SweepInterval = 5.seconds

  private[edge] def create(config: EdgeConfig): Resource[IO, EdgeConnection] =
    for
      admission <- Resource.eval(AdmissionControl.create(config.trustLocalProxy))
      owners <- Resource.eval(OwnerCache.create(config.roomCacheTtlMs))
      _ <- sweeper(owners)
      httpClient <- Resource.eval(
        IO(
          HttpClient
            .newBuilder()
            .connectTimeout(Duration.ofMillis(ConnectTimeout.toMillis))
            .build()
        )
      )
    yield EdgeConnection(config, httpClient, owners, admission)

  /** Expired room codes must not accumulate when they are looked up once and never again. */
  private def sweeper(owners: OwnerCache): Resource[IO, Unit] =
    Resource
      .make(Stream.awakeEvery[IO](SweepInterval).evalMap(_ => owners.sweep).compile.drain.start)(
        _.cancel
      )
      .map(_ => ())
