import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, MOVES, ROUND_END_TIMING } = await evaluate(
  "frontend/src/game/engine.ts",
  ["Match", "MOVES", "ROUND_END_TIMING"],
);
const { superStageTransition, longSuperVideoOwner } = await evaluate(
  "frontend/src/pages/GamePage/functions/superStageTransition.ts",
  ["superStageTransition", "longSuperVideoOwner"],
);
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
const fadeInMs = 320;
assert.equal(
  m.superIntro?.durationMs,
  fadeInMs + 4160,
  "Sakiko gets a blackout before her voice starts",
);
const layers = () =>
  superStageTransition(m.superCasts, [{ video: "sakiko.mp4" }, null], m.phase);
assert.equal(layers().showVideo, false);
m.advance(70);
assert.ok(layers().blackOpacity > 0 && layers().blackOpacity < 1);
m.advance(70);
assert.deepEqual(layers(), {
  showVideo: true,
  stageOpacity: 0,
  blackOpacity: 1,
});
m.advance(fadeInMs - 140);
assert.deepEqual(layers(), {
  showVideo: true,
  stageOpacity: 0,
  blackOpacity: 0,
});
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
assert.ok(
  layers().showVideo && layers().stageOpacity > 0 && layers().stageOpacity < 1,
);
const impacts = [];
for (let i = 0; i < 180; i++) {
  m.advance(10);
  for (const e of m.drainEvents())
    if (e.type === "memePulse") impacts.push(m.superCasts[0].elapsedMs);
}
assert.deepEqual(impacts, [4760, 5160, 5560], "rain follows the spoken climax");

const soyo = duel([1, 0]);
soyo.advance(10, { super: true });
soyo.advance(fadeInMs + 1570);
assert.equal(soyo.fighters[0].soyoSuper?.released, false);
soyo.advance(10);
assert.ok(
  soyo.drainEvents().some((event) => event.type === "soyoSuperRelease"),
);
assert.equal(soyo.superCasts[0].elapsedMs, 1580);

const finish = duel([13, 0]);
finish.fighters[1].hp = 1;
finish.hit(0, "mewtype_13_virtual_super", 160, 100, { damage: 10 });
finish.endRound();
const finishTick = finish.roundEnd.tick;
finish.advance(ROUND_END_TIMING.knockout + 1500);
finish.completeFinish(0, finishTick);
finish.advance(50);
assert.equal(finish.phase, "roundOver", "the other listener is still playing");
finish.completeFinish(1, finishTick);
finish.advance(300);
assert.equal(
  finish.phase,
  "ready",
  "a short finish exits once both listeners complete",
);

const chant = duel([12, 0]);
chant.advance(10, { super: true });
assert.equal(chant.superIntro, null, "short supers skip the blackout");
assert.equal(chant.superCasts[0].elapsedMs, 0);
assert.equal(chant.fighters[1].hp, 995, "the first syllable hits immediately");
assert.deepEqual(
  superStageTransition(
    chant.superCasts,
    [{ video: "chant.mp4" }, null],
    chant.phase,
  ),
  { showVideo: false, stageOpacity: 1, blackOpacity: 0 },
  "an immediate super keeps the normal arena",
);

const tomori = duel([2, 0]);
tomori.fighters[1].x = 300;
tomori.advance(10, { super: true });
tomori.advance(tomori.superIntro?.durationMs ?? 0);
const waveLaunches = [];
let control = 0;
for (let i = 0; i < 100; i++) {
  tomori.advance(10);
  const events = tomori.drainEvents();
  waveLaunches.push(...events.filter((event) => event.type === "voicePulse"));
  if (events.some((event) => event.type === "hit" && event.side === 0))
    control = tomori.fighters[1].hardStun;
}
assert.equal(waveLaunches.length, 1, "normal Tomori fires one wave");
assert.equal(tomori.fighters[1].hp, 980, "the wave deals 20 damage");
assert.equal(control, 2000, "the wave inflicts two seconds of hard stun");

const guarded = duel([2, 0]);
guarded.fighters[1].x = 300;
guarded.advance(10, { super: true }, { guard: true });
guarded.advance(guarded.superIntro?.durationMs ?? 0, {}, { guard: true });
guarded.advance(800, {}, { guard: true });
assert.ok(guarded.fighters[1].hp > 980);
assert.equal(guarded.fighters[1].hardStun, 0, "guard blocks the hard stun");

const short = duel([4, 0]);
short.advance(10, { super: true });
assert.equal(
  short.superIntro?.durationMs,
  200,
  "short cue has no blackout delay",
);
assert.deepEqual(
  superStageTransition(
    short.superCasts,
    [{ video: "taki.mp4" }, null],
    short.phase,
  ),
  { showVideo: false, stageOpacity: 1, blackOpacity: 0 },
);

const penguin = duel([2, 0]);
penguin.fighters[0].penguin = { ms: 20000 };
penguin.advance(10, { super: true });
assert.equal(penguin.superIntro, null);
assert.deepEqual(
  superStageTransition(
    penguin.superCasts,
    [{ video: "penguin.mp4" }, null],
    penguin.phase,
  ),
  { showVideo: true, stageOpacity: 1, blackOpacity: 0 },
  "Penguin plays its requested background behind the arena",
);
const beats = chant
  .drainEvents()
  .filter((e) => e.type === "hit" && e.side === 0)
  .map(() => 0);
for (let i = 0; i < 900; i++) {
  chant.advance(10);
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
const rivalVideos = [{ video: "sakiko.mp4" }, { video: "rana.mp4" }];
assert.equal(
  longSuperVideoOwner(simultaneous.superCasts, rivalVideos)?.side,
  0,
);
assert.equal(
  longSuperVideoOwner(
    [
      { ...first, id: 20 },
      { ...second, id: 30 },
    ],
    rivalVideos,
  )?.side,
  1,
  "a newly started long cast takes over a previous video",
);
simultaneous.advance(fadeInMs + 4160);
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
