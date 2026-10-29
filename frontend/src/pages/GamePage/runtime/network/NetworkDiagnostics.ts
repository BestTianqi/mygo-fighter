export class NetworkDiagnostics {
  readonly enabled =
    new URLSearchParams(location.search).get("diagnostics") === "1";
  private values: Record<string, number[]> = {};
  private lastSnapshot = 0;
  private lastReport = 0;
  private pendingInput = 0;
  private pendingMotion: { at: number; x: number; y: number } | null = null;
  private sentInputs = new Map<number, { at: number; received: boolean }>();
  reset() {
    this.values = {};
    this.lastSnapshot = this.lastReport = this.pendingInput = 0;
    this.pendingMotion = null;
    this.sentInputs.clear();
    this.text = "";
  }
  motionInput(at: number, position: { x: number; y: number }) {
    if (this.enabled) this.pendingMotion = { at, x: position.x, y: position.y };
  }
  motion(now: number, position: { x: number; y: number }) {
    const p = this.pendingMotion;
    if (p && (p.x !== position.x || p.y !== position.y)) {
      this.add("inputMotionMs", Math.max(0, now - p.at));
      this.pendingMotion = null;
    }
    if (p && now - p.at > 2000) this.pendingMotion = null;
  }
  text = "";
  add(name: string, value: number) {
    if (!this.enabled) return;
    const samples = (this.values[name] ??= []);
    samples.push(value);
    if (samples.length > 600) samples.shift();
  }
  input(now: number) {
    if (this.enabled && !this.pendingInput) this.pendingInput = now;
  }
  inputSent(sequence: number, now: number) {
    if (!this.enabled) return;
    this.sentInputs.set(sequence, { at: now, received: false });
    if (this.sentInputs.size > 600)
      this.sentInputs.delete(this.sentInputs.keys().next().value!);
  }
  acknowledge(
    received: readonly number[],
    applied: readonly number[],
    side: number,
    now: number,
  ) {
    if (!this.enabled) return;
    for (const [sequence, sample] of this.sentInputs) {
      if (!sample.received && sequence <= (received[side] ?? 0)) {
        sample.received = true;
        this.add("inputReceivedMs", Math.max(0, now - sample.at));
      }
      if (sequence <= (applied[side] ?? 0)) {
        this.add("inputAppliedMs", Math.max(0, now - sample.at));
        this.sentInputs.delete(sequence);
      }
    }
  }
  simulated(now: number) {
    if (this.pendingInput)
      this.add("inputStepMs", Math.max(0, now - this.pendingInput));
    this.pendingInput = 0;
  }
  snapshot(now: number, serverMs: number, bytes: number) {
    if (this.lastSnapshot) this.add("snapshotGapMs", now - this.lastSnapshot);
    this.lastSnapshot = now;
    this.add("serverUpdateMs", serverMs);
    this.add("snapshotBytes", bytes);
  }
  report(now: number) {
    if (!this.enabled || now - this.lastReport < 1000) return false;
    this.lastReport = now;
    const metrics = Object.fromEntries(
      Object.entries(this.values).map(([key, samples]) => {
        const ordered = [...samples].sort((a, b) => a - b);
        return [
          key,
          {
            p50: ordered[Math.floor(ordered.length * 0.5)] ?? 0,
            p95: ordered[Math.floor(ordered.length * 0.95)] ?? 0,
            n: ordered.length,
          },
        ];
      }),
    );
    this.text = Object.entries(metrics)
      .map(([name, v]) => `${name}: ${v.p95.toFixed(1)} p95`)
      .join(" · ");
    (window as Window & { mygoDiagnostics?: unknown }).mygoDiagnostics =
      metrics;
    return true;
  }
}
