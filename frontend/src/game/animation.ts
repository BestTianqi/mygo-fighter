import type { Match } from "./engine";
import type { Fighter } from "./objects/Fighter";
/* Visual pose selection only. Combat timing and movement stay in engine.ts. */

import { MOVES, FEEL, ROUND_END_TIMING } from "./engine";
// A stride is measured in world units, so a blocked fighter cannot walk in place.
const MUJICA_MOTION: Record<
  number,
  { stride: number; breath: number; sway: number; lift: number; weight: number }
> = {
  5: { stride: 78, breath: 2700, sway: 0.6, lift: 0.65, weight: 2.8 },
  6: { stride: 70, breath: 3300, sway: 0.45, lift: 0.75, weight: 3.2 },
  7: { stride: 86, breath: 2500, sway: 1.05, lift: 0.95, weight: 4.2 },
  8: { stride: 66, breath: 3800, sway: 0.35, lift: 0.5, weight: 2.6 },
  9: { stride: 84, breath: 2200, sway: 1.2, lift: 1.1, weight: 4.5 },
};
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
function createMujicaMotion() {
  const states = new WeakMap();
  return function motion(
    match: Match,
    side: number,
    animation: string | null,
    reduced = false,
  ) {
    const f = match.fighters[side],
      profile = MUJICA_MOTION[f.character];
    if (!profile) return null;
    let state = states.get(f);
    if (!state) {
      state = { time: 0, last: match.elapsed, x: f.x, distance: 0 };
      states.set(f, state);
    }
    const dt = Math.max(0, Math.min(60, match.elapsed - state.last));
    const frozen = match.paused || match.freeze > 0;
    if (!frozen) {
      state.time += dt;
      if (!f.dashMs && !f.attack && match.grounded(f))
        state.distance += Math.min(30, Math.abs(f.x - state.x));
    }
    state.last = match.elapsed;
    state.x = f.x;
    if (
      reduced ||
      !["fighting", "ready"].includes(match.phase) ||
      f.stun ||
      f.knockdown ||
      f.guard ||
      f.crouch ||
      f.dashMs ||
      !match.grounded(f) ||
      /^(?:mask-|crawl-|landing|jump-|getup)/.test(animation || "")
    )
      return null;
    const stage = !!f.stageForm,
      strength = stage ? 1.16 : 1;
    const breath = Math.sin(
      (state.time * Math.PI * 2) / profile.breath + side * 1.7,
    );
    let lean = breath * profile.sway,
      lift = (breath + 1) * 0.5 * profile.lift;
    if (f.attack) {
      const move = MOVES[f.attack ?? ""],
        t = f.attackMs;
      if (!move || move.crawl) return null;
      const weight =
        profile.weight * strength * (move.category === "normal" ? 1 : 1.2);
      const preparation = -weight * 0.45;
      if (t < move.start)
        lean = preparation * smooth(t / Math.max(1, move.start));
      else if (t <= move.end)
        lean =
          weight *
          (1 -
            0.3 *
              smooth((t - move.start) / Math.max(1, move.end - move.start)));
      else {
        const settle = smooth(
          (t - move.end) / Math.max(1, move.duration - move.end),
        );
        lean = weight * 0.7 * (1 - settle);
      }
      // Mortis' recoil is deliberately less balanced than Mutsumi's quiet posture.
      if (f.character === 8 && stage) lean *= 1.35;
      lift = 0;
    } else if (Math.abs(f.vx) > 25) {
      const step = (state.distance / profile.stride) * Math.PI * 2;
      lean =
        (Math.sign(f.vx) * f.facing * 1.2 + Math.sin(step) * profile.sway) *
        strength;
      lift = Math.sin(step) ** 2 * profile.lift;
    }
    return { lean, lift };
  };
}
// Deform only the torso; shoes and the complete lower leg remain planted.
function mujicaBodyOffset(
  motion: { lean: number; lift: number } | null,
  height: number,
) {
  if (!motion) return { x: 0, y: 0 };
  const upper = smooth((height - 0.24) / 0.65);
  return { x: motion.lean * upper, y: -motion.lift * upper };
}
function createAnimator() {
  const states = new WeakMap();
  return function choose(match: Match, side: number) {
    const live = match.fighters[side];
    const impact =
      match.roundEnd &&
      ROUND_END_TIMING.total - match.phaseMs < ROUND_END_TIMING.impact;
    const f: Fighter = impact
      ? {
          ...live,
          ...match.roundEnd!.fighters[side],
          penguin: match.roundEnd!.fighters[side].penguin
            ? (live.penguin ?? { ms: 1 })
            : null,
          stageForm: match.roundEnd!.fighters[side].stageForm
            ? (live.stageForm ?? { ms: 1 })
            : null,
        }
      : live;
    if (f.character > 14) return null;
    const ground = match.grounded(f),
      now = match.elapsed;
    let state = states.get(live);
    if (!state) {
      state = {
        ground,
        crouch: f.crouch,
        stunned: false,
        landedAt: -Infinity,
        lowHit: false,
        x: f.x,
        stride: 0,
      };
      states.set(live, state);
    }
    const moving =
      ground && !f.attack && !f.stun && !f.dashMs && Math.abs(f.vx) > 25;
    if (MUJICA_MOTION[f.character] && !match.paused && !match.freeze) {
      state.stride = moving
        ? state.stride + Math.min(30, Math.abs(f.x - state.x))
        : 0;
    }
    state.x = f.x;
    if (!state.ground && ground) state.landedAt = now;
    if (f.stun && !state.stunned) state.lowHit = state.crouch || f.crouch;
    state.ground = ground;
    state.crouch = f.crouch;
    state.stunned = !!f.stun;
    if (!impact && ["roundOver", "finished"].includes(match.phase)) {
      if (match.winner === side) return "victory";
      return f.hp <= 0
        ? ground
          ? "knockdown-ground"
          : "knockdown-fall"
        : match.winner < 0
          ? f.character < 2
            ? null
            : "idle"
          : "hit-low";
    }
    if (f.knockdown)
      return !ground
        ? "knockdown-fall"
        : f.knockdown > 160
          ? "knockdown-ground"
          : "getup";
    if (f.stun)
      return f.guard
        ? state.lowHit
          ? "guard-crouch"
          : "guard-standing"
        : f.penguin
          ? "hit-high"
          : state.lowHit
            ? "hit-low"
            : "hit-high";
    if (f.landingRecovery) return "landing";
    if (f.attack) {
      const move = MOVES[f.attack ?? ""],
        t = f.attackMs;
      if (move.crawl)
        return t < move.start
          ? "crawl-windup"
          : t > move.end
            ? "crawl-recover"
            : Math.floor((t - move.start) / 160) % 2
              ? "crawl-b"
              : "crawl-a";
      if (f.character >= 5) {
        if (f.attack === "throw")
          return t < move.start ? "throw-windup" : "throw-release";
        return (
          move.visualSlot +
          "-" +
          (t < move.start ? "windup" : t <= move.end ? "impact" : "recover")
        );
      }
      if (move.chain) {
        const phase = t < move.start ? 0 : t <= move.end ? 1 : 2;
        if (f.penguin)
          return (
            move.chain === 2
              ? ["kick-medium", "kick-light", "walk-pass"]
              : ["call-windup", "flipper-heavy", "normal-recover"]
          )[phase];
        if (f.character === 3)
          return (
            move.chain === 2
              ? ["throw-windup", "standing-medium", "throw-release"]
              : ["super-windup", "rising-impact", "normal-recover"]
          )[phase];
        if (f.character === 4)
          return (
            move.chain === 2
              ? ["throw-windup", "standing-medium", "normal-recover"]
              : ["super-windup", "uppercut-impact", "normal-recover"]
          )[phase];
        return (
          "jab-" + move.chain + "-" + ["windup", "impact", "recover"][phase]
        );
      }
      if (f.character === 4) {
        const attack = move.base || f.attack;
        if (attack === "rikiCalibrate")
          return t < move.start ? "calibrate-windup" : "calibrate-release";
        if (attack === "rikiSuper")
          return t < move.start
            ? "super-windup"
            : t <= move.end
              ? "super-release"
              : "normal-recover";
        if (attack === "throw")
          return t < move.start ? "throw-windup" : "throw-release";
        if (t < move.start)
          return move.stance === "crouch"
            ? "guard-crouch"
            : move.stance === "air"
              ? "jump-rise"
              : attack === "rikiOverhead"
                ? "super-windup"
                : "normal-windup";
        if (t > move.end + (move.projectile ? 100 : 0))
          return ground
            ? move.stance === "crouch"
              ? "guard-crouch"
              : "normal-recover"
            : "jump-fall";
        if (move.stance)
          return (
            move.stance + "-" + f.attack.replace(/^riki_(?:crouch_|air_)?/, "")
          );
        return {
          rikiRoll: "roll-release",
          rikiRush: "rush-impact",
          rikiOverhead: "overhead-impact",
          rikiShock: "ground-shock",
          rikiRise: "uppercut-impact",
          rikiEight: "eight-beat-release",
        }[attack];
      }
      if (f.character === 3) {
        if (f.attack === "ranaParfait")
          return t < 90
            ? "parfait-ready"
            : t < move.start
              ? "parfait-windup"
              : t < 400
                ? "parfait-release"
                : "parfait-recover";
        if (f.attack === "ranaTune")
          return t < move.start ? "tune-windup" : "tune-release";
        if (f.attack === "ranaSuper")
          return t < move.start ? "super-windup" : "super-release";
        if (f.attack === "throw")
          return t < move.start ? "throw-windup" : "throw-release";
        if (t < move.start)
          return move.stance === "crouch"
            ? "guard-crouch"
            : move.stance === "air"
              ? "jump-rise"
              : "normal-windup";
        if (t > move.end + (move.projectile ? 130 : 0))
          return ground
            ? move.stance === "crouch"
              ? "guard-crouch"
              : "normal-recover"
            : "jump-fall";
        if (move.stance)
          return (
            move.stance + "-" + f.attack.replace(/^rana_(?:crouch_|air_)?/, "")
          );
        return {
          ranaPick: "pick-release",
          ranaChord: "pick-release",
          ranaRush: "rush-impact",
          ranaRise: "rising-impact",
          ranaSlide: "low-slide",
          ranaDive: "dive-impact",
          ranaSolo: "solo-release",
        }[f.attack];
      }
      if (f.penguin) {
        if (f.attack === "penguinSuper")
          return t < move.start
            ? "call-windup"
            : t <= move.end
              ? "call-release"
              : "normal-recover";
        if (f.attack === "penguinCry") return "cry-counter";
        if (t < move.start)
          return f.attack === "penguinCall" ? "call-windup" : "normal-windup";
        if (t > move.end + (move.projectile ? 120 : 0)) return "normal-recover";
        if (move.penguinNormal) {
          const kick = move.normalIndex! % 6 >= 3;
          if (move.stance === "crouch")
            return kick ? "crouch-kick" : "crouch-flipper";
          if (move.stance === "air") return kick ? "air-kick" : "air-flipper";
          return [
            "flipper-light",
            "flipper-medium",
            "flipper-heavy",
            "kick-light",
            "kick-medium",
            "kick-heavy",
          ][move.normalIndex! % 6];
        }
        return (
          {
            penguinKick: "flying-kick",
            penguinHey: "hey-release",
            penguinLaugh: "laugh-release",
            penguinCall: "call-release",
            throw: "flipper-heavy",
          }[f.attack] || "normal-recover"
        );
      }
      if (f.character === 2) {
        if (f.attack === "tomoriSuper")
          return t < move.start
            ? "echo-windup"
            : t <= move.end
              ? "chorus-release"
              : "normal-recover";
        if (t < move.start)
          return move.tomoriOnly && f.attack !== "tomoriNote"
            ? "echo-windup"
            : "normal-windup";
        if (t > move.end + (move.projectile ? 130 : 0)) return "normal-recover";
        return (
          {
            light: "mic-light",
            heavy: "mic-heavy",
            throw: "mic-heavy",
            tomoriNote: "note-release",
            tomoriEcho: "echo-release",
            tomoriChorus: "chorus-release",
          }[f.attack] || "normal-recover"
        );
      }
      if (f.character === 1) {
        if (f.attack === "soyoCutline")
          return t < move.start
            ? "normal-windup"
            : t < 330
              ? "jab-2-impact"
              : t <= move.end + 60
                ? "palm-heavy"
                : "normal-recover";
        if (f.attack === "heal")
          return t < 220
            ? "heal-prepare"
            : t < move.start
              ? "heal-channel"
              : t < 950
                ? "heal-release"
                : "heal-recover";
        if (f.attack === "soyoSuper")
          return t < move.start
            ? "normal-windup"
            : t < 2450
              ? "cast-release"
              : "normal-recover";
        if (t < move.start) return "normal-windup";
        if (
          t >
          move.end +
            (["wave", "summon", "special"].includes(f.attack) ? 120 : 0)
        )
          return "normal-recover";
        return f.attack === "light"
          ? "palm-light"
          : ["heavy", "throw"].includes(f.attack)
            ? "palm-heavy"
            : "cast-release";
      }
      if (f.attack === "super" || f.attack === "dive" || move.stance === "air")
        return null;
      if (f.attack === "rising")
        return t < move.start
          ? "normal-windup"
          : t <= move.end + 110
            ? "rising-impact"
            : f.vy > 0
              ? "jump-rise"
              : "jump-fall";
      const crouch = move.stance === "crouch";
      if (t < move.start) return crouch ? "crouch-windup" : "normal-windup";
      if (t > move.end + (move.projectile || f.attack === "shield" ? 150 : 0))
        return crouch ? "crouch-recover" : "normal-recover";
      if (f.attack === "thrust") return "thrust-impact";
      if (f.attack === "spin") return "spin-impact";
      if (move.projectile || f.attack === "shield") return "sonic-release";
      return null; // Existing fist/kick impact frames and the original throw.
    }
    if (f.guard || (f.crouch && ground))
      return f.crouch ? "guard-crouch" : "guard-standing";
    if (f.dashMs)
      return f.penguin
        ? f.vx * f.facing < 0
          ? "walk-pass"
          : "flipper-heavy"
        : f.vx * f.facing < 0
          ? "dash-back"
          : "dash-forward";
    if (!ground)
      return f.character !== 0
        ? f.vy > 0
          ? "jump-rise"
          : "jump-fall"
        : f.vy > FEEL.jump * 0.8
          ? "jump-takeoff"
          : f.vy > 0
            ? "jump-rise"
            : "jump-fall";
    if (
      f.character >= 5 &&
      f.character < 10 &&
      f.stageForm?.ms! > 19280 &&
      Math.abs(f.vx) < 25
    ) {
      const age = 20000 - f.stageForm!.ms;
      return age < 220 ? "mask-take" : age < 440 ? "mask-raise" : "mask-settle";
    }
    if (f.penguin?.ms! > 19880 && Math.abs(f.vx) < 25) return "transform";
    if (now - state.landedAt < 110) return "landing";
    if (Math.abs(f.vx) > 25) {
      const profile = MUJICA_MOTION[f.character];
      if (profile)
        return (state.stride % profile.stride) / profile.stride < 0.58
          ? "walk-contact"
          : "walk-pass";
      return Math.floor(now / 110) % 2 ? "walk-pass" : "walk-contact";
    }
    return "idle"; // All normal forms can use their reviewed portrait idle atlas.
  };
}
export { createAnimator, createMujicaMotion, mujicaBodyOffset };
