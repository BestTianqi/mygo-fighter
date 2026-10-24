package services.rooms

import cats.effect.{IO, IOApp, Ref}
import io.circe.{parser, Json}
import cats.effect.std.Supervisor
import services.rooms.api.*
import services.rooms.objects.*
import services.rooms.utils.RoomRuntime
import services.system.objects.{Connection, ServerConfig}

/** Run with sbt "Test / runMain services.rooms.RelayRoomCheck". Exercises real messages and
  * GraalJS.
  */
object RelayRoomCheck extends IOApp.Simple:
  private def check(value: Boolean, message: String): IO[Unit] =
    IO.raiseUnless(value)(AssertionError(message))
  private def rejected(action: IO[Unit]): IO[Unit] =
    action.attempt.flatMap(result => check(result.isLeft, "request should be rejected"))
  def run: IO[Unit] =
    Supervisor[IO].use { supervisor =>
      for
        rooms <- Ref.of[IO, Map[String, RoomRuntime]](Map.empty)
        sessions <- Ref.of[IO, Map[String, Session]](Map.empty)
        source <- IO.blocking(
          java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/simulation.js"))
        )
        c = Connection(
          rooms,
          sessions,
          source,
          Vector(Json.obj()),
          ServerConfig("127.0.0.1", 0, ""),
          supervisor
        )
        hostResponse <- CreateRoomMessage().plan(c)
        guestResponse <- JoinRoomMessage(hostResponse.room.code).plan(c)
        host <- ResolveSessionMessage(hostResponse.token).plan(c)
        guest <- ResolveSessionMessage(guestResponse.token).plan(c)
        room <- rooms.get.map(_(host.code))
        _ <- room.state.update(s =>
          s.copy(players = s.players.map(_.map(_.copy(connected = true))))
        )
        _ <- rejected(ChooseRoomMessage(guest, None, None, None, Some("3v3"), None).plan(c))
        _ <- ChooseRoomMessage(host, None, None, Some(false), Some("3v3"), None).plan(c)
        _ <- rejected(ReadyRoomMessage(host, true).plan(c))
        _ <- rejected(
          ChooseRoomMessage(host, None, None, None, None, Some(Vector(0, 0, 1))).plan(c)
        )
        _ <- rejected(
          ChooseRoomMessage(host, None, None, None, None, Some(Vector(0, 1, 15))).plan(c)
        )
        _ <- ChooseRoomMessage(host, None, None, None, None, Some(Vector(0, 2, 4))).plan(c)
        _ <- ReadyRoomMessage(host, true).plan(c)
        _ <- ChooseRoomMessage(guest, None, None, None, None, Some(Vector(1, 3, 5))).plan(c)
        changed <- room.state.get
        _ <- check(
          changed.players.forall(_.exists(p => !p.ready)),
          "selection clears both ready flags"
        )
        _ <- ReadyRoomMessage(host, true).plan(c)
        _ <- ReadyRoomMessage(guest, true).plan(c)
        preparing <- room.state.get
        config = preparing.config.get
        _ <- check(config.hcursor.get[String]("format").contains("3v3"), "prepare format")
        _ <- check(
          config.hcursor
            .get[Vector[Vector[Int]]]("teams")
            .contains(Vector(Vector(0, 2, 4), Vector(1, 3, 5))),
          "ordered teams"
        )
        _ <- rejected(LoadedRoomMessage(host, preparing.generation - 1).plan(c))
        _ <- LoadedRoomMessage(host, preparing.generation).plan(c)
        waiting <- room.simulation.get
        _ <- check(waiting.isEmpty, "wait for both clients to load")
        _ <- LoadedRoomMessage(guest, preparing.generation).plan(c)
        simulation <- room.simulation.get.map(_.get)
        snapshotRaw <- room.lock.permit.use(_ => simulation.packet)
        snapshot <- IO.fromEither(parser.parse(snapshotRaw))
        _ <- check(
          snapshot.hcursor
            .downField("state")
            .get[Vector[Vector[Int]]]("teams")
            .contains(Vector(Vector(0, 2, 4), Vector(1, 3, 5))),
          "JVM simulation receives teams"
        )
        _ <- PauseRoomMessage(host, true).plan(c)
        _ <- room.state.update(s =>
          s.copy(players = s.players.updated(1, s.players(1).map(_.copy(connected = false))))
        )
        _ <- rejected(RestartRoomMessage(host).plan(c))
        _ <- room.state.update(s =>
          s.copy(players = s.players.map(_.map(_.copy(connected = true))))
        )
        _ <- RestartRoomMessage(host).plan(c)
        restartedRaw <- room.lock.permit.use(_ => simulation.packet)
        restarted <- IO.fromEither(parser.parse(restartedRaw))
        _ <- check(
          restarted.hcursor
            .downField("state")
            .get[Vector[Int]]("teamIndices")
            .contains(Vector(0, 0)),
          "restart resets relay"
        )
        _ <- LobbyRoomMessage(host).plan(c)
        lobby <- room.state.get
        _ <- check(
          lobby.phase == RoomPhase.Lobby && lobby.players.forall(
            _.exists(p => !p.ready && p.team.size == 3)
          ),
          "lobby preserves teams and clears readiness"
        )
        _ <- ChooseRoomMessage(host, None, None, None, Some("1v1"), None).plan(c)
        duel <- room.state.get
        _ <- check(
          duel.players.forall(_.exists(_.team.size == 1)),
          "duel keeps only starting fighter"
        )
        _ <- IO.println(
          "Relay room checks passed: authorization, teams, readiness, loading barrier, JVM simulation, restart and lobby."
        )
      yield ()
    }
