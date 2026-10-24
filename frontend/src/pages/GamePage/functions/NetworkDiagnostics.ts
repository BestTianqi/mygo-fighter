export class NetworkDiagnostics {
  readonly enabled =
    new URLSearchParams(location.search).get("diagnostics") === "1";
  private values: Record<string, number[]> = {};
  private lastSnapshot = 0;
  private lastReport = 0;
  private pendingInput = 0;
  private pendingMotion: { at: number; x: number; y: number } | null = null;
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
