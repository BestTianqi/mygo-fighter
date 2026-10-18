/* Shared world camera. Canvas uses (x, 438 - height); HUD stays in screen space. */
(function (root) {
  'use strict';
  const SAFE = Object.freeze({ left: 64, right: 896, top: 104, bottom: 440 });
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function fighterBounds(f) {
    const giant = f.attack === 'super', reach = giant ? 240 : 130;
    return { left: f.x - reach, right: f.x + reach, top: 438 - f.y - (giant ? 380 : 280), bottom: 438 - f.y + 14 };
  }
  class Camera {
    constructor() { this.x = 480; this.y = 300; this.zoom = 1; }
    snapshot() { return { x: this.x, y: this.y, zoom: this.zoom }; }
    viewport() { return { left: this.x - 480 / this.zoom, top: this.y - 270 / this.zoom, width: 960 / this.zoom, height: 540 / this.zoom }; }
    project(x, y) { return { x: 480 + (x - this.x) * this.zoom, y: 270 + (y - this.y) * this.zoom }; }
    reset(match) { this.update(match, 0, true); }
    update(match, dt, snap = false) {
      if (match.paused && !snap) return;
      const boxes = match.fighters.map(fighterBounds);
      const left = Math.min(...boxes.map(b => b.left)), right = Math.max(...boxes.map(b => b.right));
      const top = Math.min(...boxes.map(b => b.top)), bottom = Math.max(...boxes.map(b => b.bottom));
      const fit = Math.min(1.08, (SAFE.right - SAFE.left) / (right - left), (SAFE.bottom - SAFE.top) / (bottom - top));
      // Pull back immediately to contain dashes/launches; approach slowly to avoid zoom pumping.
      const ease = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / 1000 * 3);
      this.zoom = fit < this.zoom || snap ? fit : this.zoom + (fit - this.zoom) * ease;
      // Keep feet just above the meters; distant views show the upper scenery rather than excess ground fill.
      const x = (left + right) / 2, y = bottom - (SAFE.bottom - 270) / this.zoom;
      const follow = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / 1000 * 6);
      this.x += (x - this.x) * follow; this.y += (y - this.y) * follow;
      // Limit smoothing lag so neither character enters the HUD or leaves the view.
      this.x = clamp(this.x, right - (SAFE.right - 480) / this.zoom, left + (480 - SAFE.left) / this.zoom);
      this.y = clamp(this.y, bottom - (SAFE.bottom - 270) / this.zoom, top + (270 - SAFE.top) / this.zoom);
    }
  }
  const api = { Camera, SAFE, fighterBounds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoCamera = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
