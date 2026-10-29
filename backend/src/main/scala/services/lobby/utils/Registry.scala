package services.lobby.utils

import cats.effect.IO
import services.lobby.objects.{InstanceRecord, LobbyConfig, LobbyConnection, Reservation}
import services.system.objects.internal.{
  InstanceSummary,
  PlacementResult,
  RegisteredRoom,
  RoomOwnerResult
}

/** Placement, directory and budget bookkeeping for the lobby process. Heartbeats rebuild the
  * code-to-instance directory, while reservations bridge the gap between "the edge received a room
  * code" and "the rooms instance reports the room". All tables live in refs owned by the
  * connection.
  *
  * Placement serializes through one permit: code uniqueness, per-instance capacity and the global
  * room budget are all checked against the same snapshot, so two concurrent creates cannot both
  * consume the last free slot.
  */
object Registry:
  private val CodeBytes = 3
  private val CodeAttempts = 5

  /** Registers or refreshes an instance and rebuilds the directory entries that it owns. */
  private[lobby] def applyHeartbeat(
      connection: LobbyConnection,
      summary: InstanceSummary
  ): IO[Unit] =
    val reported = summary.rooms.map(room => room.code.trim.toUpperCase).toSet
    for
      at <- now
      _ <- connection.instances.update(
        _.updated(
          summary.instanceId,
          InstanceRecord(
            summary.instanceId,
            summary.instanceUrl,
            summary.capacity,
            summary.rooms,
            at
          )
        )
      )
      _ <- connection.directory.update { directory =>
        directory.filterNot { case (code, owner) =>
          owner == summary.instanceId && !reported.contains(code)
        } ++ reported.map(code => code -> summary.instanceId)
      }
      _ <- connection.reservations.update(
        _.filterNot { case (code, reservation) =>
          reservation.instanceId == summary.instanceId && reported.contains(code)
        }
      )
    yield ()

  /** The instance that reports the normalized `code`. A live placement also counts: the host's
    * first follow-up request can arrive before the instance's asynchronous registration, and the
    * placed instance already owns the code at that point.
    */
  private[lobby] def owner(
      connection: LobbyConnection,
      code: String
  ): IO[Option[RoomOwnerResult]] =
    val normalized = normalize(code)
    for
      directory <- connection.directory.get
      instances <- connection.instances.get
      reservations <- connection.reservations.get
    yield directory
      .get(normalized)
      .orElse(reservations.get(normalized).map(_.instanceId))
      .flatMap(instances.get)
      .map(record => RoomOwnerResult(record.instanceId, record.instanceUrl))

  /** Reserves one fresh code on the least loaded live instance; None when nothing can be placed. */
  private[lobby] def place(connection: LobbyConnection): IO[Option[PlacementResult]] =
    connection.placementLock.permit.use(_ => now.flatMap(at => placeAt(connection, at)))

  /** Publishes a code that a rooms instance has confirmed and releases its placement hold. */
  private[lobby] def applyRegistered(
      connection: LobbyConnection,
      room: RegisteredRoom
  ): IO[Unit] =
    val code = normalize(room.code)
    connection.instances.get.flatMap { instances =>
      instances.get(room.instanceId) match
        case None    => IO.unit
        case Some(_) =>
          connection.directory.update(_.updated(code, room.instanceId)) *>
            connection.reservations.update(_.removed(code))
    }

  /** Drops stale instances, their directory entries, and reservations past their deadline. */
  private[lobby] def expire(connection: LobbyConnection): IO[Unit] =
    for
      at <- now
      instances <- connection.instances.get
      alive = instances.values.collect {
        case record if isAlive(record, connection.config, at) => record.instanceId
      }.toSet
      _ <- connection.instances.update(_.removedAll(instances.keySet -- alive))
      _ <- connection.directory.update(_.filter { case (_, owner) => alive.contains(owner) })
      _ <- connection.reservations.update(
        _.filter { case (_, reservation) => reservation.expiresAt > at }
      )
    yield ()

  /** A fresh secure random draw rendered as uppercase hexadecimal. */
  private[lobby] def nonce(bytes: Int): IO[String] = IO {
    val data = new Array[Byte](bytes)
    new java.security.SecureRandom().nextBytes(data)
    data.map(value => f"${value & 0xff}%02X").mkString
  }

  private def placeAt(connection: LobbyConnection, at: Long): IO[Option[PlacementResult]] =
    for
      instances <- connection.instances.get
      directory <- connection.directory.get
      reservations <- connection.reservations.get
      target = select(connection.config, at, instances, directory, reservations)
      placed <- target.fold(IO.pure(Option.empty[PlacementResult]))(record =>
        reserve(connection, record, at, directory, reservations, CodeAttempts)
      )
    yield placed

  /** Least loaded live instance with a free slot, both per instance (ROOMS_PER_INSTANCE and the
    * instance's own capacity) and globally (MAX_ROOMS including placements in flight).
    */
  private def select(
      config: LobbyConfig,
      at: Long,
      instances: Map[String, InstanceRecord],
      directory: Map[String, String],
      reservations: Map[String, Reservation]
  ): Option[InstanceRecord] =
    if directory.size + reservations.size >= config.maxRooms then None
    else
      val reserved = reservations.values.groupMapReduce(_.instanceId)(_ => 1)(_ + _)
      def load(record: InstanceRecord): Int =
        record.rooms.size + reserved.getOrElse(record.instanceId, 0)
      instances.values
        .filter(record => isAlive(record, config, at))
        .filter(record => load(record) < math.min(config.roomsPerInstance, record.capacity))
        .toVector
        .sortBy(record => (load(record), record.instanceId))
        .headOption

  private def reserve(
      connection: LobbyConnection,
      record: InstanceRecord,
      at: Long,
      directory: Map[String, String],
      reservations: Map[String, Reservation],
      attempts: Int
  ): IO[Option[PlacementResult]] =
    if attempts <= 0 then IO.pure(None)
    else
      nonce(CodeBytes).flatMap { code =>
        if directory.contains(code) || reservations.contains(code) then
          reserve(connection, record, at, directory, reservations, attempts - 1)
        else
          val reservation =
            Reservation(code, record.instanceId, at + connection.config.reservationTtlMs)
          connection.reservations
            .modify(current =>
              if current.contains(code) then (current, false)
              else (current.updated(code, reservation), true)
            )
            .flatMap { inserted =>
              if inserted then
                IO.pure(Some(PlacementResult(record.instanceId, record.instanceUrl, code)))
              else reserve(connection, record, at, directory, reservations, attempts - 1)
            }
      }

  private def isAlive(record: InstanceRecord, config: LobbyConfig, at: Long): Boolean =
    at - record.receivedAt <= config.instanceTtlMs

  private def normalize(code: String): String = code.trim.toUpperCase

  private def now: IO[Long] = IO.monotonic.map(_.toMillis)
