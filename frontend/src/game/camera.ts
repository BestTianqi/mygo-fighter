import type { Match } from "./engine";
import type { Fighter } from "./objects/Fighter";
/* Shared world camera. Canvas uses (x, 438 - height); HUD stays in screen space. */

import { FEEL } from "./engine";
const SAFE = Object.freeze({ left: 64, right: 896, top: 104, bottom: 440 });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function fighterBounds(f: Fighter) {
  const giant = f.attack === "super",
    reach = giant ? 240 : 130;
  return {
    left: f.x - reach,
    right: f.x + reach,
    top: 438 - f.y - (giant ? 380 : 280),
    bottom: 438 - f.y + 14,
  };
}
class Camera {
  x = 480;
  y = 300;
  zoom: number = FEEL.baseZoom;
  pulse: { ms: number; power: number; x: number } | null = null;
  constructor() {
    this.x = 480;
    this.y = 300;
    this.zoom = FEEL.baseZoom;
    this.pulse = null;
  }
  snapshot() {
    return { x: this.x, y: this.y, zoom: this.zoom };
  }
  viewport() {
    return {
      left: this.x - 480 / this.zoom,
      top: this.y - 270 / this.zoom,
      width: 960 / this.zoom,
      height: 540 / this.zoom,
    };
  }
  project(x: number, y: number) {
    return {
      x: 480 + (x - this.x) * this.zoom,
      y: 270 + (y - this.y) * this.zoom,
    };
  }
  reset(match: Match) {
    this.pulse = null;
    this.update(match, 0, true);
  }
  impact(event: { blocked?: boolean; weight: number; x: number }) {
    if (event.blocked || event.weight < 2) return;
    const power = event.weight === 3 ? 0.224 : 0.148;
    if (!this.pulse || power >= this.pulse.power)
      this.pulse = { ms: 300, power, x: event.x };
  }
  update(match: Match, dt: number, snap = false) {
    if (match.paused && !snap) return;
    if (this.pulse) {
      this.pulse.ms -= dt;
      if (this.pulse.ms <= 0) this.pulse = null;
    }
    const boxes = match.fighters.map(fighterBounds);
    const left = Math.min(...boxes.map((b) => b.left)),
      right = Math.max(...boxes.map((b) => b.right));
    const top = Math.min(...boxes.map((b) => b.top)),
      bottom = Math.max(...boxes.map((b) => b.bottom));
    const accent = this.pulse ? (this.pulse.power * this.pulse.ms) / 300 : 0;
    const fit = Math.min(
      FEEL.baseZoom * (1 + accent),
      (SAFE.right - SAFE.left) / (right - left),
      (SAFE.bottom - SAFE.top) / (bottom - top),
    );
    // Pull back immediately to contain dashes/launches; approach slowly to avoid zoom pumping.
    const ease = snap ? 1 : 1 - Math.exp((-Math.max(0, dt) / 1000) * 3);
    const safetyFit = Math.min(
      (SAFE.right - SAFE.left) / (right - left),
      (SAFE.bottom - SAFE.top) / (bottom - top),
    );
    const delta = fit - this.zoom;
    const approach = this.pulse
      ? Math.sign(delta) *
        Math.min(
          Math.abs(delta),
          (FEEL.baseZoom * (delta > 0 ? 3.9 : 6) * dt) / 1000,
        )
      : delta * (delta < 0 ? 1 - Math.exp((-dt / 1000) * 6) : ease);
    this.zoom = snap ? fit : Math.min(safetyFit, this.zoom + approach);
    // Keep feet just above the meters; distant views show the upper scenery rather than excess ground fill.
    const center = (left + right) / 2;
    const x = center + (this.pulse ? (this.pulse.x - center) * accent : 0),
      y = bottom - (SAFE.bottom - 270) / this.zoom;
    const follow = snap ? 1 : 1 - Math.exp((-Math.max(0, dt) / 1000) * 6);
    this.x += (x - this.x) * follow;
    this.y += (y - this.y) * follow;
    // Limit smoothing lag so neither character enters the HUD or leaves the view.
    this.x = clamp(
      this.x,
      right - (SAFE.right - 480) / this.zoom,
      left + (480 - SAFE.left) / this.zoom,
    );
    this.y = clamp(
      this.y,
      bottom - (SAFE.bottom - 270) / this.zoom,
      top + (270 - SAFE.top) / this.zoom,
    );
  }
}
export { Camera, SAFE, fighterBounds };
