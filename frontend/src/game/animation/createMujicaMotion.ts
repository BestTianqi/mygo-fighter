import type { Match } from "../engine";
import { MOVES } from "../engine";
import type { Fighter } from "../objects/Fighter";
import { MUJICA_MOTION } from "./motionProfiles";
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
function createMujicaMotion() {
  type Motion = { lean: number; lift: number; width: number };
  const states = new WeakMap<
    Fighter,
    {
      time: number;
      last: number;
      x: number;
      distance: number;
      moving: boolean;
      ground: boolean;
      fallSpeed: number;
      landedAt: number;
      landingWeight: number;
      facing: number;
      turnedAt: number;
      pose: Motion | null;
    }
  >();
  return function motion(
    match: Match,
    side: number,
    animation: string | null,
    reduced = false,
  ) {
    const f = match.fighters[side],
      profile = MUJICA_MOTION[f.character],
      ground = match.grounded(f);
    if (!profile) return null;
    let state = states.get(f);
    if (!state) {
      state = {
        time: 0,
        last: match.elapsed,
        x: f.x,
        distance: 0,
        moving: false,
        ground,
        fallSpeed: 0,
        landedAt: -Infinity,
        landingWeight: 0,
        facing: f.facing,
        turnedAt: -Infinity,
        pose: null,
      };
      states.set(f, state);
    }
    const dt = Math.max(0, Math.min(60, match.elapsed - state.last));
    state.last = match.elapsed;
    const distance = Math.min(30, Math.abs(f.x - state.x));
    state.x = f.x;
    if (reduced) return null;
    const authoredOnly =
      !["fighting", "ready"].includes(match.phase) ||
      f.stun ||
      f.knockdown ||
      f.guard ||
      f.crouch ||
      f.dashMs ||
      !ground ||
      /^(?:mask-|crawl-|jump-|getup)/.test(animation || "");
    // Repeated render calls during pause/hitstop must not ease toward a new pose.
    if (match.paused || match.freeze > 0)
      return authoredOnly ? null : state.pose;
    state.time += dt;
    const moving = ground && !f.dashMs && !f.attack && Math.abs(f.vx) > 25;
    state.distance = moving
      ? (state.moving ? state.distance : 0) + distance
      : 0;
    state.moving = moving;
    if (!ground) state.fallSpeed = Math.max(state.fallSpeed, -f.vy);
    if (ground && !state.ground) {
      state.landedAt = state.time;
      state.landingWeight = Math.min(1, state.fallSpeed / 800);
      state.fallSpeed = 0;
    }
    state.ground = ground;
    if (f.facing !== state.facing) {
      // Preserve world-space weight when the authored drawing changes facing.
      if (state.pose) state.pose = { ...state.pose, lean: -state.pose.lean };
      state.facing = f.facing;
      state.turnedAt = state.time;
    }
    if (authoredOnly) {
      state.pose = null;
      return null;
    }
    const stage = !!f.stageForm,
      strength = stage ? 1.16 : 1;
    const breath = Math.sin(
      (state.time * Math.PI * 2) / profile.breath + side * 1.7,
    );
    let lean = breath * profile.sway,
      lift = (breath + 1) * 0.5 * profile.lift,
      width = 1;
    if (f.attack) {
      const move = MOVES[f.attack ?? ""],
        t = f.attackMs;
      if (!move || move.crawl) {
        state.pose = null;
        return null;
      }
      const weight =
        profile.weight *
        strength *
        (move.category === "normal" ? 1 : 1.2) *
        (move.visualSlot?.includes("heavy") ? 1.25 : 1) *
        (move.chain ? 1 + (move.chain - 1) * 0.12 : 1);
      const preparation = -weight * 0.45;
      const strikeMs = Math.min(65, (move.end - move.start) * 0.5);
      if (t < move.start)
        lean = preparation * smooth(t / Math.max(1, move.start));
      else if (t < move.start + strikeMs)
        lean =
          preparation +
          (weight - preparation) * smooth((t - move.start) / strikeMs);
      else if (t <= move.end)
        lean =
          weight *
          (1 -
            0.3 *
              smooth(
                (t - move.start - strikeMs) /
                  Math.max(1, move.end - move.start - strikeMs),
              ));
      else {
        const settle = smooth(
          (t - move.end) / Math.max(1, move.duration - move.end),
        );
        lean =
          weight * (0.7 * (1 - settle) - 0.12 * Math.sin(Math.PI * settle));
      }
      // Mortis' recoil is deliberately less balanced than Mutsumi's quiet posture.
      if (f.character === 8 && stage) lean *= 1.35;
      lift = 0;
    } else if (moving) {
      const step = (state.distance / profile.stride) * Math.PI * 2;
      lean =
        (Math.sign(f.vx) * f.facing * 1.2 + Math.sin(step) * profile.sway) *
        strength;
      lift = Math.sin(step) ** 2 * profile.lift;
      width += Math.sin(step * 2) * 0.006;
    }
    // Whole-body compression is anchored at the soles, including on platforms.
    const landingAge = state.time - state.landedAt;
    if (landingAge < 220 && !f.attack) {
      const compression =
        Math.sin((landingAge / 220) * Math.PI) *
        Math.exp(-landingAge / 160) *
        9 *
        state.landingWeight;
      lift -= compression;
      width += compression / 280;
    }
    const turnAge = state.time - state.turnedAt;
    if (turnAge < 140 && !f.attack)
      width -= Math.sin((turnAge / 140) * Math.PI) * 0.08;
    const previous = state.pose ?? { lean: 0, lift: 0, width: 1 };
    const ease = 1 - Math.exp(-dt / (f.attack ? 28 : 65));
    state.pose = {
      lean: previous.lean + (lean - previous.lean) * ease,
      lift: previous.lift + (lift - previous.lift) * (1 - Math.exp(-dt / 35)),
      width:
        previous.width + (width - previous.width) * (1 - Math.exp(-dt / 30)),
    };
    return state.pose;
  };
}
export { createMujicaMotion };
