package services.rooms.utils

import cats.effect.{Deferred, IO, Ref}
import cats.effect.std.{Queue, Semaphore, Supervisor}
import fs2.Stream
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import org.http4s.websocket.WebSocketFrame
import scala.concurrent.duration.*
import services.rooms.objects.*

final case class RoomRuntime(
    state: Ref[IO, RoomState],
    peers: Ref[IO, Map[Int, Peer]],
    simulation: Ref[IO, Option[Simulation]],
    lock: Semaphore[IO],
    lastTick: Ref[IO, FiniteDuration],
    lastSend: Ref[IO, FiniteDuration],
    lastActivity: Ref[IO, FiniteDuration],
    lastConnected: Ref[IO, FiniteDuration],
    stopped: Deferred[IO, Unit],
    wake: Queue[IO, Unit]
):
  private[rooms] def stop: IO[Unit] = stopped.complete(()).void

  private[rooms] def signal: IO[Unit] =
    lastSend.set(Duration.Zero) *> wake.tryOffer(()).void

  private[rooms] def resumeClock: IO[Unit] =
    IO.monotonic.flatMap(lastTick.set) *> signal

  private[rooms] def start(supervisor: Supervisor[IO]): IO[Unit] =
    supervisor
      .supervise(
        Stream
          .unfoldEval[IO, FiniteDuration, Unit](Duration.Zero) { deadline =>
            IO.monotonic.flatMap { started =>
              tick(started)
                .handleErrorWith { error =>
                  lock.permit.use(_ =>
                    resetLobby *> peers.get.flatMap(
                      _.values.toList.traverse_(
                        _.send("error", Json.obj("message" -> Json.fromString("对战已停止，请重新准备")))
                      )
                    )
                  ) *> IO.println(s"Room stopped: ${error.getClass.getSimpleName}").as(true)
                }
                .flatMap { checked =>
                  (simulation.get, IO.monotonic).tupled.flatMap { (engine, finished) =>
                    // Idle rooms need only a liveness check. A load/resume/control
                    // change wakes them immediately; active rooms retain 120 Hz.
                    val active = !checked || engine.exists(_.running)
                    // Do not allocate race fibers at combat frequency. Commands
                    // already wait at most one active tick; only idle sleep needs a wake.
                    if active then
                      val period = 8333333L
                      val base = if deadline == Duration.Zero then started else deadline
                      val due = base + period.nanos
                      val skipped =
                        if finished >= due then (finished - due).toNanos / period + 1L else 0L
                      val next = due + (skipped * period).nanos
                      IO.sleep((next - finished).max(Duration.Zero)).as(Some(((), next)))
                    else IO.race(wake.take, IO.sleep(250.millis)).as(Some(((), Duration.Zero)))
                  }
                }
            }
          }
          .interruptWhen(stopped.get.attempt)
          .compile
          .drain
      )
      .void

  private[rooms] def view: IO[RoomView] = state.get.map(RoomRuntime.publicView)
  private[rooms] def broadcast: IO[Unit] =
    (view, peers.get).tupled.flatMap((room, clients) =>
      clients.values.toList.traverse_(_.send("room", room.asJson))
    ) *> signal

  private[rooms] def resetLobby: IO[Unit] =
    simulation.getAndSet(None).flatMap(_.traverse_(_.close)) *>
      peers.get.flatMap(_.values.toList.traverse_(_.latest.set(None))) *>
      state.update(s =>
        s.copy(
          phase = RoomPhase.Lobby,
          config = None,
          loaded = Set.empty,
          generation = s.generation + 1,
          players = s.players.map(_.map(_.copy(ready = false)))
        )
      ) *>
      broadcast

  private[rooms] def disconnect(side: Int, peerId: String): IO[Unit] = lock.permit.use { _ =>
    peers.get.flatMap { clients =>
      if !clients.get(side).exists(_.id == peerId) then IO.unit
      else
        peers.update(_ - side) *>
          IO.monotonic.flatMap(lastConnected.set) *>
          state.update(s =>
            s.copy(
              loaded = s.loaded - side,
              players = s.players.updated(side, s.players(side).map(_.copy(connected = false)))
            )
          ) *>
          simulation.get.flatMap(_.traverse_(_.pause(true))) *>
          state.get.flatMap(s => if s.phase == RoomPhase.Preparing then resetLobby else broadcast)
    }
  }

  private[rooms] def tick(now: FiniteDuration): IO[Boolean] = IO.uncancelable { poll =>
    // Commands and GraalJS share this room lock. Skip a busy room's clock;
    // cancellation may interrupt work only after the release guarantee is installed.
    lock.tryAcquire.flatMap { acquired =>
      if !acquired then IO.pure(false)
      else
        poll(
          peers.get.flatMap(_.toList.traverse_ { (side, peer) =>
            peer.seenAt.get.flatMap { seen =>
              if now - seen <= 3.seconds then IO.unit
              else
                peers.update(_ - side) *>
                  lastConnected.set(now) *>
                  state.update(s =>
                    s.copy(
                      loaded = s.loaded - side,
                      players =
                        s.players.updated(side, s.players(side).map(_.copy(connected = false)))
                    )
                  ) *>
                  simulation.get.flatMap(_.traverse_(_.pause(true))) *>
                  peer.control
                    .tryOffer(org.http4s.websocket.WebSocketFrame.Close())
                    .void *> broadcast
            }
          }) *>
            lastTick.getAndSet(now).flatMap { previous =>
              simulation.get.flatMap(_.traverse_ { engine =>
                engine.advance(
                  if engine.running then math.min(50d, (now - previous).toNanos.toDouble / 1000000d)
                  else 0d,
                  now.toNanos.toDouble / 1000000d
                ) *>
                  lastSend.get.flatMap { sent =>
                    if engine.running && now - sent < 16666666.nanos then IO.unit
                    else
                      peers.get.flatMap { clients =>
                        if clients.isEmpty then engine.eventBatch.void
                        else
                          (engine.eventBatch, engine.packet, state.get).tupled.flatMap {
                            (batch, packet, room) =>
                              IO.monotonic.flatMap { finished =>
                                val updateMs = (finished - now).toNanos.toDouble / 1000000d
                                // The kernel is trusted and already serialized. Add transport metadata once.
                                val stateFrame =
                                  WebSocketFrame.Text(
                                    s"""{"type":"state","data":{"generation":${room.generation},"serverUpdateMs":$updateMs,${packet
                                        .drop(1)}}"""
                                  )
                                val eventFrame = batch.map(events =>
                                  WebSocketFrame.Text(
                                    s"""{"type":"events","data":{"generation":${room.generation},${events
                                        .drop(1)}}"""
                                  )
                                )
                                clients.values.toList.traverse_ { peer =>
                                  eventFrame.traverse_(peer.sendEvent) *> peer.latest
                                    .set(Some(stateFrame))
                                } *> lastSend
                                  .set(
                                    sent + (((now - sent).toNanos / 16666666L) * 16666666L).nanos
                                  )
                              }
                          }
                      }
                  }
              })
            }
        ).as(true).guarantee(lock.release)
    }
  }

object RoomRuntime:
  private[rooms] def publicView(s: RoomState): RoomView =
    RoomView(
      s.code,
      s.format,
      s.arena,
      s.terrain,
      s.generation,
      s.players.zipWithIndex.map((player, side) =>
        player.map(p =>
          PlayerView(p.character, p.team, p.ready, p.connected, s.loaded.contains(side))
        )
      ),
      s.phase == RoomPhase.Playing,
      s.phase == RoomPhase.Preparing,
      RoomDraft.view(s),
      s.rules
    )

  private[rooms] def create(code: String): IO[RoomRuntime] =
    IO.monotonic.flatMap { now =>
      (
        Ref.of[IO, RoomState](RoomState(code, Vector(None, None))),
        Ref.of[IO, Map[Int, Peer]](Map.empty),
        Ref.of[IO, Option[Simulation]](None),
        Semaphore[IO](1),
        Ref.of[IO, FiniteDuration](now),
        Ref.of[IO, FiniteDuration](now),
        Ref.of[IO, FiniteDuration](now),
        Ref.of[IO, FiniteDuration](now),
        Deferred[IO, Unit],
        Queue.bounded[IO, Unit](1)
      ).mapN(RoomRuntime.apply)
    }

  private[rooms] def find(connection: Connection, code: String): IO[RoomRuntime] =
    connection.rooms.get.flatMap(rooms =>
      IO.fromOption(rooms.get(code))(IllegalArgumentException("找不到房间，请核对房间码"))
    )
