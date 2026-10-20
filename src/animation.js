/* Visual pose selection only. Combat timing and movement stay in engine.js. */
(function (root) {
  'use strict';
  const { MOVES, FEEL } = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.MygoFighter;
  function createAnimator() {
    const states = new WeakMap();
    return function choose(match, side) {
      const f = match.fighters[side];
      if (f.character > 4) return null;
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
        if (move.chain) {
          const phase = t < move.start ? 0 : t <= move.end ? 1 : 2;
          if (f.penguin) return (move.chain === 2
            ? ['kick-medium', 'kick-light', 'walk-pass']
            : ['call-windup', 'flipper-heavy', 'normal-recover'])[phase];
          if (f.character === 3) return (move.chain === 2
            ? ['throw-windup', 'standing-medium', 'throw-release']
            : ['super-windup', 'rising-impact', 'normal-recover'])[phase];
          if (f.character === 4) return (move.chain === 2
            ? ['throw-windup', 'standing-medium', 'normal-recover']
            : ['super-windup', 'uppercut-impact', 'normal-recover'])[phase];
          return 'jab-' + move.chain + '-' + ['windup', 'impact', 'recover'][phase];
        }
        if (f.character === 4) {
          const attack = move.base || f.attack;
          if (attack === 'rikiCalibrate') return t < move.start ? 'calibrate-windup' : 'calibrate-release';
          if (attack === 'rikiSuper') return t < move.start ? 'super-windup' : t <= move.end ? 'super-release' : 'normal-recover';
          if (attack === 'throw') return t < move.start ? 'throw-windup' : 'throw-release';
          if (t < move.start) return move.stance === 'crouch' ? 'guard-crouch' : move.stance === 'air' ? 'jump-rise' : attack === 'rikiOverhead' ? 'super-windup' : 'normal-windup';
          if (t > move.end + (move.projectile ? 100 : 0)) return ground ? move.stance === 'crouch' ? 'guard-crouch' : 'normal-recover' : 'jump-fall';
          if (move.stance) return move.stance + '-' + f.attack.replace(/^riki_(?:crouch_|air_)?/, '');
          return ({ rikiRoll: 'roll-release', rikiRush: 'rush-impact', rikiOverhead: 'overhead-impact', rikiShock: 'ground-shock', rikiRise: 'uppercut-impact', rikiEight: 'eight-beat-release' })[attack];
        }
        if (f.character === 3) {
          if (f.attack === 'ranaParfait') return t < 90 ? 'parfait-ready' : t < move.start ? 'parfait-windup' : t < 400 ? 'parfait-release' : 'parfait-recover';
          if (f.attack === 'ranaTune') return t < move.start ? 'tune-windup' : 'tune-release';
          if (f.attack === 'ranaSuper') return t < move.start ? 'super-windup' : 'super-release';
          if (f.attack === 'throw') return t < move.start ? 'throw-windup' : 'throw-release';
          if (t < move.start) return move.stance === 'crouch' ? 'guard-crouch' : move.stance === 'air' ? 'jump-rise' : 'normal-windup';
          if (t > move.end + (move.projectile ? 130 : 0)) return ground ? move.stance === 'crouch' ? 'guard-crouch' : 'normal-recover' : 'jump-fall';
          if (move.stance) return move.stance + '-' + f.attack.replace(/^rana_(?:crouch_|air_)?/, '');
          return ({ ranaPick: 'pick-release', ranaChord: 'pick-release', ranaRush: 'rush-impact', ranaRise: 'rising-impact', ranaSlide: 'low-slide', ranaDive: 'dive-impact', ranaSolo: 'solo-release' })[f.attack];
        }
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
          if (f.attack === 'soyoSuper') return t < move.start ? 'normal-windup' : t < 2450 ? 'cast-release' : 'normal-recover';
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
      if (f.dashMs) return f.penguin ? (f.vx * f.facing < 0 ? 'walk-pass' : 'flipper-heavy') : f.vx * f.facing < 0 ? 'dash-back' : 'dash-forward';
      if (!ground) return f.character !== 0 ? (f.vy > 0 ? 'jump-rise' : 'jump-fall') : f.vy > FEEL.jump * .8 ? 'jump-takeoff' : f.vy > 0 ? 'jump-rise' : 'jump-fall';
      if (f.penguin?.ms > 19880 && Math.abs(f.vx) < 25) return 'transform';
      if (now - state.landedAt < 110) return 'landing';
      if (Math.abs(f.vx) > 25) return Math.floor(now / 110) % 2 ? 'walk-pass' : 'walk-contact';
      return f.character >= 2 ? 'idle' : null; // Preserve the approved Anon/Soyo idle exactly.
    };
  }
  const api = { createAnimator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoAnimation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
