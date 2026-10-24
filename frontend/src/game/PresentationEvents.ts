import { HISTORY_MS, type SimulationPacket } from "./networkProtocol";

/** Recover skipped snapshot cues once, without playing a TCP backlog of expired effects. */
export class PresentationEvents {
  private epoch = -1;
  private cursor = 0;
  private serverNow = 0;
  private localAt = 0;
  reset() {
    this.epoch = -1;
    this.cursor = this.serverNow = this.localAt = 0;
  }
  consume(packet: SimulationPacket, now: number, rtt: number) {
    if (packet.epoch < this.epoch) return [];
    if (packet.epoch !== this.epoch) {
      this.epoch = packet.epoch;
      this.cursor = 0;
    }
    this.serverNow = Math.max(
      this.localAt ? this.serverNow + Math.max(0, now - this.localAt) : 0,
      packet.time + Math.max(0, rtt) / 2,
    );
    this.localAt = now;
    const events = packet.events
      .filter((e) => e.id > this.cursor && this.serverNow - e.at <= HISTORY_MS)
      .map((e) => e.event);
    for (const e of packet.events) this.cursor = Math.max(this.cursor, e.id);
    return events;
  }
}
