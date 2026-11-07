import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, MOVES } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
]);
function duel(characters = [6, 0]) {
  const m = new Match({ mode: "duel", characters, rules: { maxHealth: 1000 } });
  m.start();
  m.advance(3000);
  m.drainEvents();
  m.fighters.forEach((f, i) => {
    f.energy = 100;
    f.x = i * 160;
  });
  return m;
}
const m = duel();
m.advance(10, { super: true });
assert.equal(
  m.superIntro?.durationMs,
  4160,
  "Sakiko waits for the actual spoken key phrase",
);
const frozen = structuredClone({
  fighters: m.fighters,
  remaining: m.remaining,
  waves: m.waves,
  areas: m.areas,
});
m.advance(4000, { right: true }, { left: true, heavy: true });
assert.deepEqual(
  {
    fighters: m.fighters,
    remaining: m.remaining,
    waves: m.waves,
    areas: m.areas,
  },
  frozen,
  "intro freezes both players, resources and the round clock",
);
assert.equal(m.superCasts[0].elapsedMs, 4000);
m.advance(160);
assert.equal(m.superIntro, null);
assert.equal(m.fighters[1].hp, 1000);
m.advance(10);
assert.ok(m.fighters[0].binding, "control releases at the key phrase");
const impacts = [];
for (let i = 0; i < 180; i++) {
  m.advance(10);
  for (const e of m.drainEvents())
    if (e.type === "memePulse") impacts.push(m.superCasts[0].elapsedMs);
}
assert.deepEqual(impacts, [4760, 5160, 5560], "rain follows the spoken climax");
const chant = duel([12, 0]);
const beats = [];
for (let i = 0; i < 900; i++) {
  chant.advance(10, i === 0 ? { super: true } : {});
  for (const e of chant.drainEvents())
    if (e.type === "hit" && e.side === 0)
      beats.push(chant.superCasts[0].elapsedMs);
}
assert.deepEqual(
  beats,
  [0, 860, 1640, 2560, 3480, 4560, 5520, 6480, 7740],
  "nine strikes track nine syllables, without accumulated hitstop",
);
assert.equal(1000 - chant.fighters[1].hp, 50);
const simultaneous = duel([6, 3]);
simultaneous.advance(10, { super: true }, { super: true });
const first = simultaneous.superCasts[0],
  second = simultaneous.superCasts[1];
assert.ok(
  second.elapsedMs < 0 && second.held,
  "shorter intro waits so simultaneous releases stay aligned",
);
simultaneous.advance(4160);
assert.equal(first.elapsedMs, MOVES[first.attack].cinematic.leadInMs);
assert.equal(second.elapsedMs, MOVES[second.attack].cinematic.leadInMs);
const paused = duel();
paused.advance(10, { super: true });
paused.setPaused(true);
const before = JSON.stringify(paused.superCasts);
paused.advance(1000);
assert.equal(JSON.stringify(paused.superCasts), before);
paused.restart();
assert.ok(paused.superCasts.every((x) => x === null));
assert.equal(paused.superIntro, null);

// An intro may interrupt a tick after fighter timers advance but before contacts.
// Resume those contacts once, before advancing those timers again.
const transformCast = duel([5, 2]);
transformCast.fighters[1].x = 80;
const bursts = [];
const originalHit = transformCast.hit.bind(transformCast);
transformCast.hit = (...args) => {
  if (args[1] === "mujicaTransform") bursts.push(args);
  return originalHit(...args);
};
transformCast.advance(10, { transform: true }, { super: true });
assert.ok(transformCast.superIntro);
transformCast.advance(transformCast.superIntro.durationMs + 20);
assert.equal(
  bursts.length,
  1,
  "same-tick transformation burst resolves once, respecting target invulnerability",
);

const blood = duel([8, 2]);
const fist = "mujica_8_stage_blood_fist";
blood.fighters[0].stageForm = { ms: 20000 };
blood.fighters[0].attack = fist;
blood.fighters[0].attackMs = MOVES[fist].start - 10;
blood.fighters[0].cooldown = 1000;
blood.advance(10, {}, { super: true });
assert.ok(blood.superIntro);
assert.equal(blood.fighters[0].lifesteal, null);
blood.advance(blood.superIntro.durationMs + 20);
assert.equal(
  blood.fighters[0].lifesteal?.ratio,
  0.4,
  "release-point buff survives intro",
);
assert.equal(
  blood.drainEvents().filter((e) => e.type === "lifestealStart").length,
  1,
);

const supers = Object.entries(MOVES).filter(
  ([, move]) => move.category === "super",
);
assert.equal(supers.length, 22);
for (const [key, move] of supers) {
  assert.ok(move.cinematic, `${key}: every form has media timing`);
  assert.ok(move.cinematic.leadInMs >= 0 && move.cinematic.mediaDelayMs >= 0);
}
const interrupted = new Match({
  mode: "duel",
  format: "3ffa",
  teams: [
    [12, 0, 1],
    [0, 1, 2],
    [2, 3, 4],
  ],
  rules: { maxHealth: 1000, infiniteTime: true },
});
interrupted.start();
interrupted.advance(3000);
interrupted.drainEvents();
interrupted.fighters.forEach((f, i) => {
  f.x = [400, 560, 1300][i];
  f.energy = 100;
});
const interruptedHits = [];
for (let i = 0; i < 1600; i++) {
  interrupted.advance(
    10,
    i === 0 ? { super: true } : {},
    {},
    i === 100 ? { super: true } : {},
  );
  for (const event of interrupted.drainEvents())
    if (event.type === "hit" && event.side === 0)
      interruptedHits.push(interrupted.superCasts[0].elapsedMs);
}
assert.deepEqual(
  interruptedHits,
  beats,
  "another player's intro pauses an ongoing musical super without drift",
);
console.log(
  "Ultimate timelines: frozen intros, simultaneous casts, pause/reset and nine musical hits passed.",
);
