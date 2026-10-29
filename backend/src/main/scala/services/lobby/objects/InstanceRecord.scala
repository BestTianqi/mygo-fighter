package services.lobby.objects

import services.system.objects.internal.RoomSummary

/** Latest heartbeat view of one rooms process. `receivedAt` is a monotonic millisecond stamp used
  * to decide whether the instance may still receive new room placements.
  */
final case class InstanceRecord(
    instanceId: String,
    instanceUrl: String,
    capacity: Int,
    rooms: Vector[RoomSummary],
    receivedAt: Long
)
