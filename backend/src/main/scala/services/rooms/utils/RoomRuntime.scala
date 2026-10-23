package services.rooms.utils

import cats.effect.{IO, Ref}
import cats.effect.std.Semaphore
import cats.syntax.all.*
import io.circe.Json
import io.circe.syntax.*
import scala.concurrent.duration.*
import services.rooms.objects.*
import services.system.objects.Connection

final case class RoomRuntime(
    state: Ref[IO, RoomState],
    peers: Ref[IO, Map[Int, Peer]],
    simulation: Ref[IO, Option[Simulation]],
    lock: Semaphore[IO],
    lastTick: Ref[IO, FiniteDuration],
    lastSend: Ref[IO, FiniteDuration],
    lastActivity: Ref[IO, FiniteDuration]
):
  private[rooms] def view: IO[RoomView] = state.get.map(RoomRuntime.publicView)
  private[rooms] def broadcast: IO[Unit] =
    (view, peers.get).tupled.flatMap((room, clients) =>
      clients.values.toList.traverse_(_.send("room", room.asJson))
    )

  private[rooms] def resetLobby: IO[Unit] =
    simulation.getAndSet(None).flatMap(_.traverse_(_.close)) *>
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
          state.update(s =>
            s.copy(players =
              s.players.updated(side, s.players(side).map(_.copy(connected = false)))
            )
          ) *>
          simulation.get.flatMap(_.traverse_(_.pause(true))) *>
          state.get.flatMap(s => if s.phase == RoomPhase.Preparing then resetLobby else broadcast)
    }
  }

  private[rooms] def tick(now: FiniteDuration): IO[Unit] = lock.tryAcquire.flatMap { acquired =>
    if !acquired then IO.unit
    else
      (
        peers.get.flatMap(_.toList.traverse_ { (side, peer) =>
          peer.seenAt.get.flatMap { seen =>
            if now - seen <= 3.seconds then IO.unit
            else
              peers.update(_ - side) *>
                state.update(s =>
                  s.copy(players =
                    s.players.updated(side, s.players(side).map(_.copy(connected = false)))
                  )
                ) *>
                simulation.get.flatMap(_.traverse_(_.pause(true))) *>
                peer.control.tryOffer(org.http4s.websocket.WebSocketFrame.Close()).void *> broadcast
          }
        }) *>
          lastTick.getAndSet(now).flatMap { previous =>
            simulation.get.flatMap(_.traverse_ { engine =>
              engine.advance(math.min(50d, (now - previous).toNanos.toDouble / 1000000d)) *>
                lastSend.get.flatMap { sent =>
                  if now - sent < 16666666.nanos then IO.unit
                  else
                    (engine.packet, state.get, peers.get).tupled.flatMap {
                      (packet, room, clients) =>
                        val data =
                          packet.deepMerge(Json.obj("generation" -> room.generation.asJson))
                        val frame = Json.obj("type" -> "state".asJson, "data" -> data).noSpaces
                        clients.values.toList.traverse_(_.latest.set(Some(frame))) *> lastSend
                          .set(sent + (((now - sent).toNanos / 16666666L) * 16666666L).nanos)
                    }
                }
            })
          }
      ).guarantee(lock.release)
  }

object RoomRuntime:
  private[rooms] def publicView(s: RoomState): RoomView =
    RoomView(
      s.code,
      s.format,
      s.arena,
      s.terrain,
      s.generation,
      s.players.map(_.map(p => PlayerView(p.character, p.team, p.ready, p.connected))),
      s.phase == RoomPhase.Playing,
      s.phase == RoomPhase.Preparing
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
        Ref.of[IO, FiniteDuration](now)
      ).mapN(RoomRuntime.apply)
    }

  private[rooms] def find(connection: Connection, code: String): IO[RoomRuntime] =
    connection.rooms.get.flatMap(rooms =>
      IO.fromOption(rooms.get(code))(IllegalArgumentException("找不到房间，请核对房间码"))
    )
