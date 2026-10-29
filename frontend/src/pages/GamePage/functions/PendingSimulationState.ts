import type { StatePacket } from "../../../apis/rooms/objects";
import { HISTORY_MS, type NetworkEvent } from "../../../game/networkProtocol";

/** Replay the newest authority once per display frame, retaining reliable cues. */
export class PendingSimulationState {
  private latest: { packet: StatePacket; receivedAt: number } | null = null;
  private readonly events = new Map<number, NetworkEvent>();

  clear() {
    this.latest = null;
    this.events.clear();
  }

  push(packet: StatePacket, receivedAt: number) {
    const prior = this.latest?.packet;
    if (
      prior &&
      (prior.generation !== packet.generation || prior.epoch !== packet.epoch)
    )
      this.clear();
    this.latest = { packet, receivedAt };
    for (const event of packet.events) this.events.set(event.id, event);
    // Background tabs may stop drawing while the socket continues receiving.
    // Match the presentation window rather than retaining an unbounded backlog.
    for (const [id, event] of this.events)
      if (packet.time - event.at > HISTORY_MS) this.events.delete(id);
  }

  take() {
    if (!this.latest) return null;
    const result = {
      ...this.latest,
      packet: {
        ...this.latest.packet,
        events: [...this.events.values()].sort((a, b) => a.id - b.id),
      },
    };
    this.clear();
    return result;
  }
}
