package services.rooms.utils

import cats.effect.IO
import io.circe.Json
import org.graalvm.polyglot.{Context, Engine, HostAccess, Source, Value}
import scala.util.control.NonFatal

/** All calls are serialized by the owning room lock. No host access or Node runtime. */
final class Simulation private (context: Context, kernel: Value):
  // Keep resolved call targets; these methods are immutable for the context's lifetime.
  private val inputCall = kernel.getMember("input")
  private val advanceCall = kernel.getMember("advance")
  private val pauseCall = kernel.getMember("pause")
  private val restartCall = kernel.getMember("restart")
  private val eventsCall = kernel.getMember("eventBatch")
  private val packetCall = kernel.getMember("packet")
  @volatile private var active = true

  private[rooms] def running: Boolean = active

  private[rooms] def input(side: Int, packet: services.rooms.objects.PlayerInput): IO[Unit] =
    IO(
      inputCall.execute(Int.box(side), Long.box(packet.seq), packet.input.noSpaces)
    ).void

  private[rooms] def advance(ms: Double, now: Double): IO[Unit] = IO {
    active = advanceCall.execute(Double.box(ms), Double.box(now)).asBoolean()
  }
  private[rooms] def pause(value: Boolean): IO[Unit] = IO {
    pauseCall.execute(Boolean.box(value))
    active = !value
  }
  private[rooms] def restart: IO[Unit] = IO {
    restartCall.execute()
    active = true
  }
  private[rooms] def eventBatch: IO[Option[String]] = IO {
    val batch = eventsCall.execute()
    if batch.isNull then None else Some(batch.asString())
  }
  private[rooms] def packet: IO[String] =
    IO(packetCall.execute().asString())
  private[rooms] def close: IO[Unit] = IO.blocking(context.close())

object Simulation:
  private[rooms] def create(engine: Engine, source: Source, options: Json): IO[Simulation] =
    IO.blocking {
      val context = Context
        .newBuilder("js")
        .engine(engine)
        .allowHostAccess(HostAccess.NONE)
        .allowHostClassLookup(_ => false)
        .build()
      try
        context.eval(source)
        val kernel = context
          .getBindings("js")
          .getMember("MygoSimulation")
          .invokeMember("create", options.noSpaces)
        new Simulation(context, kernel)
      catch
        case NonFatal(error) =>
          context.close()
          throw error
    }
