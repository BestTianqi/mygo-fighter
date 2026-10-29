import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";

const { PendingSimulationState } = await evaluate(
  "frontend/src/pages/GamePage/functions/PendingSimulationState.ts",
  ["PendingSimulationState"],
);
const { PresentationEvents } = await evaluate(
  "frontend/src/game/PresentationEvents.ts",
  ["PresentationEvents"],
);
const queue = new PendingSimulationState();
const packet = (tick, extra = {}) => ({
  generation: 1,
  epoch: 1,
  tick,
  time: tick * 10,
  state: { marker: tick },
  events: [{ id: tick, at: tick * 10, event: { type: "hit", side: 0 } }],
  ...extra,
});

for (let tick = 1; tick <= 100; tick++) queue.push(packet(tick), tick * 10 + 5);
const latest = queue.take();
assert.equal(latest.packet.tick, 100, "one replay uses the newest state");
assert.equal(latest.packet.state.marker, 100);
assert.equal(
  latest.receivedAt,
  1005,
  "keep actual arrival for stale detection",
);
assert.equal(latest.packet.events.length, 100, "retain all reliable hit cues");
assert.equal(queue.take(), null, "do not repeat a replay on the next frame");
const presentation = new PresentationEvents();
assert.equal(presentation.consume(latest.packet, 1010, 0).length, 100);
assert.equal(presentation.consume(latest.packet, 1011, 0).length, 0);

const original = packet(101);
queue.push(original, 1015);
queue.push(
  { ...packet(102), events: [...original.events, ...packet(102).events] },
  1025,
);
assert.deepEqual(
  queue.take().packet.events.map((e) => e.id),
  [101, 102],
);
assert.equal(original.events.length, 1, "do not mutate received packets");

queue.push(packet(103), 1035);
queue.push(packet(1, { epoch: 2 }), 1045);
assert.deepEqual(
  queue.take().packet.events.map((e) => e.id),
  [1],
  "epoch discards old round cues",
);
queue.push(packet(104), 1055);
queue.push(packet(1, { generation: 2 }), 1065);
assert.deepEqual(
  queue.take().packet.events.map((e) => e.id),
  [1],
  "restart discards old game cues",
);

queue.push(packet(105), 1075);
queue.clear();
assert.equal(
  queue.take(),
  null,
  "disconnect/lobby/dispose clears pending authority",
);

for (let tick = 1; tick <= 10000; tick++) queue.push(packet(tick), tick * 10);
const background = queue.take();
assert.equal(background.packet.tick, 10000);
assert.equal(
  background.packet.events.length,
  201,
  "background-tab history stays bounded at two seconds",
);
assert.equal(background.packet.events[0].id, 9800);
console.log(
  "Verified latest-state replay, reliable events, epoch/lifecycle reset and bounded background history.",
);
