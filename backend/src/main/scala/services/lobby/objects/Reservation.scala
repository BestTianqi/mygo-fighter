package services.lobby.objects

/** A placed room code held for one instance until that instance registers the room or the hold
  * expires. `expiresAt` is a monotonic millisecond deadline.
  */
final case class Reservation(code: String, instanceId: String, expiresAt: Long)
