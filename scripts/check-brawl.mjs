import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, MOVES } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
]);
const { NetworkInputs } = await evaluate("frontend/src/game/NetworkInputs.ts", [
  "NetworkInputs",
]);
const { create } = await evaluate("frontend/src/game/serverSimulation.ts", [
  "create",
]);
const teams = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
];
const fresh = (extra = {}) => {
  const m = new Match({
    mode: "duel",
    format: "3ffa",
    teams,
    rules: { infiniteTime: true },
    ...extra,
  });
  m.start();
  m.advance(m.phaseMs);
  assert.equal(m.phase, "fighting");
  m.drainEvents();
  return m;
};
const check = (name, fn) => {
  fn();
  console.log("PASS", name);
};
check("three simultaneous fighters, teams and inputs", () => {
  const m = fresh();
  assert.equal(m.playerCount, 3);
  assert.deepEqual(m.teamRemaining, [3, 3, 3]);
  const before = m.fighters.map((f) => f.x);
  m.advance(10, { left: true }, { left: true }, { right: true });
  assert(m.fighters[0].x < before[0]);
  assert(m.fighters[1].x < before[1]);
  assert(m.fighters[2].x > before[2]);
  assert.equal(m.inputTick, 1);
});
for (const [key, label] of [
  ["light", "J"],
  ["heavy", "K"],
])
  check(label + " real input hits both opponents in reach", () => {
    const m = fresh();
    m.fighters[0].x = 400;
    m.fighters[1].x = 445;
    m.fighters[2].x = 490;
    m.advance(650, { [key]: true }, {}, {});
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.side === 0);
    assert(
      hits.some((e) => e.target === 1),
      JSON.stringify(hits),
    );
    assert(
      hits.some((e) => e.target === 2),
      JSON.stringify(hits),
    );
    assert(m.fighters[1].hp < 200);
    assert(m.fighters[2].hp < 200);
  });
check("P real Soyo super controls/damages both opponents", () => {
  const m = fresh({
    teams: [
      [1, 0, 2],
      [2, 3, 4],
      [3, 4, 0],
    ],
  });
  m.fighters[0].energy = 100;
  m.fighters[0].x = 400;
  m.fighters[1].x = 480;
  m.fighters[2].x = 550;
  m.advance(2000, { super: true }, {}, {});
  const events = m.drainEvents();
  for (const side of [1, 2]) {
    assert(
      events.some((e) => e.type === "hit" && e.side === 0 && e.target === side),
    );
    assert(events.some((e) => e.type === "hardControl" && e.target === side));
  }
});
check("KO waits exactly5000ms while other two players continue", () => {
  const m = fresh();
  m.fighters[0].hp = 0;
  m.advance(10);
  assert.equal(m.phase, "fighting");
  assert.equal(m.respawnMs[0], 5000);
  const before = m.fighters[2].x;
  m.advance(4990, {}, {}, { left: true });
  assert.equal(m.respawnMs[0], 10);
  assert.equal(m.fighters[0].hp, 0);
  assert(m.fighters[2].x < before);
  m.advance(10);
  assert.equal(m.respawnMs[0], 0);
  assert.equal(m.fighters[0].character, 1);
  assert.equal(m.fighters[0].hp, 200);
  assert.equal(m.fighters[0].energy, 30);
  assert(m.fighters[0].wakeInvuln > 0);
  assert.deepEqual(m.teamRemaining, [2, 3, 3]);
});
check(
  "dead, waiting and protected fighters cannot take damage or gain resonance",
  () => {
    const m = fresh();
    m.fighters[1].hp = 0;
    m.advance(10);
    const energy = m.fighters[1].energy;
    m.hit(0, "light", 0, 0, {}, 1);
    assert.equal(m.fighters[1].hp, 0);
    assert.equal(m.fighters[1].energy, energy);
    m.advance(5000);
    m.hit(0, "light", 0, 0, {}, 1);
    assert.equal(m.fighters[1].hp, 200);
    assert.equal(m.fighters[1].energy, 30);
  },
);
check("third side radial projectile hits both opponents", () => {
  const m = fresh();
  m.fighters[2].x = 400;
  m.fighters[0].x = 350;
  m.fighters[1].x = 450;
  m.spawnWave(
    2,
    Object.keys(MOVES).find((key) => MOVES[key].radial),
  );
  for (let i = 0; i < 100; i++) m.updateWaves();
  assert(m.fighters[0].hp < 200);
  assert(m.fighters[1].hp < 200);
});
check(
  "area effects hit both opponents and third-side summons belong to their owner",
  () => {
    const m = fresh({
      teams: [
        [0, 1, 2],
        [2, 3, 4],
        [1, 0, 2],
      ],
    });
    m.fighters[2].x = 400;
    m.fighters[0].x = 450;
    m.fighters[1].x = 500;
    const attack = Object.keys(MOVES).find((key) => MOVES[key].delayedArea);
    assert(attack);
    m.areas.push({
      owner: 2,
      attack,
      x: 475,
      y: 0,
      warning: 0,
      life: 100,
      radius: 150,
    });
    m.updateAreas();
    assert(m.fighters[0].hp < 200);
    assert(m.fighters[1].hp < 200);
    assert.equal(m.fighters[2].hp, 200);
    m.fighters[2].energy = 100;
    m.advance(700, {}, {}, { summon: true });
    const group = m.fighters[2].summons;
    assert(group);
    const unit = group.units[0];
    const before = unit.hp;
    m.hitMinion(0, unit, "light");
    assert(unit.hp < before);
    assert(
      m.drainEvents().some((e) => e.type === "minionHit" && e.owner === 2),
    );
  },
);
check(
  "final result freezes all3 presentations and side2 can acknowledge ultimate",
  () => {
    const m = fresh();
    m.teamIndices = [2, 2, 2];
    m.fighters[0].hp = m.fighters[1].hp = 0;
    m.fighters[1].defeatedBy = {
      side: 2,
      attack: "soyoSuper",
      character: 2,
      penguin: false,
      stageForm: false,
    };
    m.advance(10);
    assert.equal(m.roundEnd.fighters.length, 3);
    assert.equal(m.roundEnd.finisher.side, 2);
    assert.deepEqual(m.finishReady, [false, false, false]);
    m.completeFinish(2, m.roundEnd.tick);
    assert(m.finishReady[2]);
  },
);
check("simultaneous final elimination is a draw", () => {
  const m = fresh();
  m.teamIndices = [2, 2, 2];
  m.fighters.forEach((f) => (f.hp = 0));
  m.advance(10);
  assert.equal(m.phase, "finished");
  assert.equal(m.winner, -1);
  assert.deepEqual(m.eliminated, [true, true, true]);
  assert.deepEqual(m.teamRemaining, [0, 0, 0]);
});
check("final elimination leaves one winning team including third side", () => {
  const m = fresh();
  m.teamIndices = [2, 2, 2];
  m.fighters[0].hp = m.fighters[1].hp = 0;
  m.advance(10);
  assert.equal(m.phase, "finished");
  assert.equal(m.winner, 2);
});
check("timer compares reserves then HP, tied leaders draw", () => {
  const m = fresh({ rules: { roundSeconds: 30 } });
  m.teamIndices = [1, 0, 0];
  m.fighters[0].hp = 200;
  m.fighters[1].hp = 99;
  m.fighters[2].hp = 100;
  m.remaining = 10;
  m.advance(10);
  assert.equal(m.winner, 2);
  const n = fresh({ rules: { roundSeconds: 30 } });
  n.remaining = 10;
  n.advance(10);
  assert.equal(n.winner, -1);
});
check("pause preserves respawn timer, restart restores all reserves", () => {
  const m = fresh();
  m.fighters[2].hp = 0;
  m.advance(10);
  m.setPaused(true);
  m.advance(10000);
  assert.equal(m.respawnMs[2], 5000);
  m.setPaused(false);
  m.advance(10);
  assert.equal(m.respawnMs[2], 4990);
  m.restart();
  assert.equal(m.phase, "ready");
  assert.deepEqual(m.teamIndices, [0, 0, 0]);
  assert.deepEqual(m.respawnMs, [0, 0, 0]);
  assert(m.fighters.every((f) => f.hp === 200));
  assert.deepEqual(m.wins, [0, 0, 0]);
});
check(
  "target helper skips defeated opponents and 2side modes retain two fighters",
  () => {
    const m = fresh();
    m.fighters[0].x = 400;
    m.fighters[1].x = 450;
    m.fighters[2].x = 650;
    assert.equal(m.targetSide(0), 1);
    m.fighters[1].hp = 0;
    assert.equal(m.targetSide(0), 2);
    assert.equal(new Match().fighters.length, 2);
    const duel = new Match({ format: "3v3", teams: [teams[0], teams[1]] });
    assert.equal(duel.playerCount, 2);
    assert.equal(duel.fighters.length, 2);
  },
);
check("three NetworkInputs and server snapshots preserve third player", () => {
  const m = fresh();
  const n = new NetworkInputs(3);
  n.receive(2, 1, { light: true });
  n.advance(m, 10);
  assert(m.fighters[2].attack);
  assert.equal(n.state.applied[2], 1);
  n.clear();
  assert.equal(n.state.inputs.length, 3);
  const server = create(
    JSON.stringify({ format: "3ffa", mode: "duel", teams }),
  );
  let packet = JSON.parse(server.packet());
  assert.equal(packet.state.fighters.length, 3);
  assert.equal(packet.inputState.inputs.length, 3);
  assert.deepEqual(packet.state.respawnMs, [0, 0, 0]);
  server.input(2, 1, JSON.stringify({ right: true }));
  server.advance(3000);
  packet = JSON.parse(server.packet());
  assert.equal(packet.inputState.received[2], 1);
});
check("CPU controls both opponents without double stepping", () => {
  const m = fresh({ mode: "cpu" });
  const before = m.simulationTick;
  m.advance(500);
  assert.equal(m.simulationTick - before, 50);
  assert(m.inputTick > 0 && m.inputTick <= 50);
  assert(m.aiStates[1].think !== 360);
  assert(m.aiStates[2].think !== 360);
});
console.log("All brawl kernel checks passed");
