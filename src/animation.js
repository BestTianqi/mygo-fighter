/* Visual pose selection only. Combat timing and movement stay in engine.js. */
(function (root) {
  'use strict';
  const { MOVES } = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.MygoFighter;
  function createAnimator() {
    const states = new WeakMap();
    return function choose(match, side) {
      const f = match.fighters[side];
      if (f.character > 2) return null;
      const ground = match.grounded(f), now = match.elapsed;
      let state = states.get(f);
      if (!state) { state = { ground, crouch: f.crouch, stunned: false, landedAt: -Infinity, lowHit: false }; states.set(f, state); }
      if (!state.ground && ground) state.landedAt = now;
      if (f.stun && !state.stunned) state.lowHit = state.crouch || f.crouch;
      state.ground = ground; state.crouch = f.crouch; state.stunned = !!f.stun;
      if (['roundOver', 'finished'].includes(match.phase)) return match.winner === side ? 'victory' : null;
      if (f.knockdown) return !ground ? 'knockdown-fall' : f.knockdown > 160 ? 'knockdown-ground' : 'getup';
      if (f.stun) return f.guard ? (state.lowHit ? 'guard-crouch' : 'guard-standing') : f.penguin ? 'hit-high' : state.lowHit ? 'hit-low' : 'hit-high';
      if (f.landingRecovery) return 'landing';
      if (f.attack) {
        const move = MOVES[f.attack], t = f.attackMs;
        if (f.penguin) {
          if (f.attack === 'penguinCry') return 'cry-counter';
          if (t < move.start) return f.attack === 'penguinCall' ? 'call-windup' : 'normal-windup';
          if (t > move.end + (move.projectile ? 120 : 0)) return 'normal-recover';
          if (move.penguinNormal) {
            const kick = move.normalIndex % 6 >= 3;
            if (move.stance === 'crouch') return kick ? 'crouch-kick' : 'crouch-flipper';
            if (move.stance === 'air') return kick ? 'air-kick' : 'air-flipper';
            return ['flipper-light', 'flipper-medium', 'flipper-heavy', 'kick-light', 'kick-medium', 'kick-heavy'][move.normalIndex % 6];
          }
          return ({ penguinKick: 'flying-kick', penguinHey: 'hey-release', penguinLaugh: 'laugh-release', penguinCall: 'call-release', throw: 'flipper-heavy' })[f.attack] || 'normal-recover';
        }
        if (f.character === 2) {
          if (t < move.start) return move.tomoriOnly && f.attack !== 'tomoriNote' ? 'echo-windup' : 'normal-windup';
          if (t > move.end + (move.projectile ? 130 : 0)) return 'normal-recover';
          return ({ light: 'mic-light', heavy: 'mic-heavy', throw: 'mic-heavy', tomoriNote: 'note-release', tomoriEcho: 'echo-release', tomoriChorus: 'chorus-release' })[f.attack] || 'normal-recover';
        }
        if (f.character === 1) {
          if (f.attack === 'heal') return t < 220 ? 'heal-prepare' : t < move.start ? 'heal-channel' : t < 950 ? 'heal-release' : 'heal-recover';
          if (t < move.start) return 'normal-windup';
          if (t > move.end + (['wave', 'summon', 'special'].includes(f.attack) ? 120 : 0)) return 'normal-recover';
          return f.attack === 'light' ? 'palm-light' : ['heavy', 'throw'].includes(f.attack) ? 'palm-heavy' : 'cast-release';
        }
        if (f.attack === 'super' || f.attack === 'dive' || move.stance === 'air') return null;
        if (f.attack === 'rising') return t < move.start ? 'normal-windup' : t <= move.end + 110 ? 'rising-impact' : f.vy > 0 ? 'jump-rise' : 'jump-fall';
        const crouch = move.stance === 'crouch';
        if (t < move.start) return crouch ? 'crouch-windup' : 'normal-windup';
        if (t > move.end + (move.projectile || f.attack === 'shield' ? 150 : 0)) return crouch ? 'crouch-recover' : 'normal-recover';
        if (f.attack === 'thrust') return 'thrust-impact';
        if (f.attack === 'spin') return 'spin-impact';
        if (move.projectile || f.attack === 'shield') return 'sonic-release';
        return null; // Existing fist/kick impact frames and the original throw.
      }
      if (f.guard || (f.crouch && ground)) return f.crouch ? 'guard-crouch' : 'guard-standing';
      if (!ground) return f.character !== 0 ? (f.vy > 0 ? 'jump-rise' : 'jump-fall') : f.vy > 500 ? 'jump-takeoff' : f.vy > 0 ? 'jump-rise' : 'jump-fall';
      if (f.dashMs) return f.penguin ? (f.vx * f.facing < 0 ? 'walk-pass' : 'flipper-heavy') : f.vx * f.facing < 0 ? 'dash-back' : 'dash-forward';
      if (f.penguin?.ms > 19880 && Math.abs(f.vx) < 25) return 'transform';
      if (now - state.landedAt < 110) return 'landing';
      if (Math.abs(f.vx) > 25) return Math.floor(now / 110) % 2 ? 'walk-pass' : 'walk-contact';
      return f.character === 2 ? 'idle' : null; // Preserve the approved Anon/Soyo idle exactly.
    };
  }
  const api = { createAnimator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoAnimation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
