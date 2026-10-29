package services.edge.utils

import cats.effect.{IO, Ref}
import scala.concurrent.duration.*

/** Bounded cache of room code → owning instance URL. Entries expire after the configured TTL so a
  * stale owner cannot pin a room to the wrong instance for long, and the capacity cap keeps
  * attacker-supplied join codes from growing memory without bound.
  */
private[edge] final class OwnerCache private (
    entries: Ref[IO, Map[String, (String, FiniteDuration)]],
    ttl: FiniteDuration,
    maxEntries: Int
):
  private[edge] def get(code: String): IO[Option[String]] =
    IO.monotonic.flatMap { now =>
      entries.modify { current =>
        current.get(code) match
          case None                          => (current, None)
          case Some((instanceUrl, storedAt)) =>
            if now - storedAt < ttl then (current, Some(instanceUrl))
            else (current - code, None)
      }
    }

  private[edge] def put(code: String, instanceUrl: String): IO[Unit] =
    IO.monotonic.flatMap { now =>
      entries.update { current =>
        if current.contains(code) || current.size < maxEntries then
          current.updated(code, (instanceUrl, now))
        else
          current.keys.headOption match
            case Some(oldest) => (current - oldest).updated(code, (instanceUrl, now))
            case None         => current.updated(code, (instanceUrl, now))
      }
    }

  private[edge] def invalidate(code: String): IO[Unit] =
    entries.update(_ - code)

  private[edge] def sweep: IO[Unit] =
    IO.monotonic.flatMap { now =>
      entries.update(_.filter { case (_, (_, storedAt)) => now - storedAt < ttl })
    }

private[edge] object OwnerCache:
  private val MaxEntries = 4096

  private[edge] def create(ttlMs: Int): IO[OwnerCache] =
    Ref
      .of[IO, Map[String, (String, FiniteDuration)]](Map.empty)
      .map(entries => new OwnerCache(entries, ttlMs.millis, MaxEntries))
