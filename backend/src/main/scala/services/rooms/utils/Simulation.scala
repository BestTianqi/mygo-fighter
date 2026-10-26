package services.rooms.utils

import cats.effect.IO
import io.circe.Json
import org.graalvm.polyglot.{Context, HostAccess, Source, Value}

/** All calls are serialized by the owning room lock. No host access or Node runtime. */
final class Simulation private (context: Context, kernel: Value):
  private[rooms] def input(side: Int, packet: services.rooms.objects.PlayerInput): IO[Unit] =
    IO(
      kernel.invokeMember("input", Int.box(side), Long.box(packet.seq), packet.input.noSpaces)
    ).void

  private[rooms] def advance(ms: Double, now: Double): IO[Unit] = IO(
    kernel.invokeMember("advance", Double.box(ms), Double.box(now))
  ).void
  private[rooms] def pause(value: Boolean): IO[Unit] = IO(
    kernel.invokeMember("pause", Boolean.box(value))
  ).void
  private[rooms] def restart: IO[Unit] = IO(kernel.invokeMember("restart")).void
  private[rooms] def eventBatch: IO[Option[String]] = IO {
    val batch = kernel.invokeMember("eventBatch")
    if batch.isNull then None else Some(batch.asString())
  }
  private[rooms] def packet: IO[String] =
    IO(kernel.invokeMember("packet").asString())
  private[rooms] def close: IO[Unit] = IO.blocking(context.close())

object Simulation:
  private[rooms] def create(source: String, options: Json): IO[Simulation] =
    IO.blocking {
      val context = Context
        .newBuilder("js")
        .allowHostAccess(HostAccess.NONE)
        .allowHostClassLookup(_ => false)
        .build()
      val program = Source.newBuilder("js", source, "simulation.js").cached(true).build()
      context.eval(program)
      val kernel = context
        .getBindings("js")
        .getMember("MygoSimulation")
        .invokeMember("create", options.noSpaces)
      new Simulation(context, kernel)
    }
