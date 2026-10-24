import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
const result = await build({
  stdin: {
    contents: `export { Match } from './frontend/src/game/engine';export { Prediction } from './frontend/src/game/Prediction';export { create } from './frontend/src/game/serverSimulation';export { NetworkInputs } from './frontend/src/game/NetworkInputs';export { PresentationEvents } from './frontend/src/game/PresentationEvents';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { Match, Prediction, create, NetworkInputs, PresentationEvents } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(result.outputFiles[0].text).toString("base64")
  );
const options = { mode: "duel", characters: [0, 1], seed: 123 };
const server = () => create(JSON.stringify(options));
const packet = (s) => JSON.parse(s.packet());
let s = server();
s.advance(3000);
s.input(
  0,
  1,
  JSON.stringify({ unified: true, light: true, pressIds: { light: 1 } }),
);
let p = packet(s);
assert.equal(p.received[0], 1);
assert.equal(p.acks[0], -1, "Receipt must not acknowledge unapplied input");
s.input(0, 2, JSON.stringify({ unified: true, pressIds: { light: 1 } }));
s.advance(10);
p = packet(s);
assert.equal(p.acks[0], 2);
assert.equal(
  p.events.filter((e) => e.event.type === "attack").length,
  1,
  "Short tap survives release before step",
);
const presentation = new PresentationEvents();
assert.equal(
  presentation.consume(p, 100, 20).filter((e) => e.type === "attack").length,
  1,
);
assert.equal(
  presentation.consume(p, 120, 20).length,
  0,
  "Repeated snapshot never repeats a cue",
);
const delayed = structuredClone(p);
delayed.events = [{ id: 10000, at: p.time, event: { type: "attack" } }];
assert.equal(
  presentation.consume(delayed, 2300, 20).length,
  0,
  "TCP-delayed expired cues are skipped",
);
const attackId = p.events.find((e) => e.event.type === "attack").id;
assert(
  packet(s).events.some((e) => e.id === attackId),
  "Skipped state retains event",
);
s.input(
  0,
  2,
  JSON.stringify({ unified: true, light: true, pressIds: { light: 1 } }),
);
s.advance(500);
assert.equal(
  packet(s).events.filter((e) => e.event.type === "attack").length,
  1,
  "Duplicate input does not repeat attack",
);
s.advance(10, 10000);
assert(
  !packet(s).events.some((e) => e.id === attackId),
  "Events expire by server monotonic time",
);
const tick = packet(s).tick;
s.restart();
assert.equal(packet(s).tick, tick, "Restart never rewinds simulation tick");
assert.equal(packet(s).epoch, 1);
s.advance(70000, 80000);
assert(packet(s).epoch > 1, "Round advance creates a reconciliation boundary");
const match = new Match(options);
match.start();
match.advance(3000);
const input = new NetworkInputs();
match.freeze = 50;
input.receive(0, 5, { unified: true, light: true, pressIds: { light: 1 } });
const before = match.simulationTick;
input.advance(match, 10);
assert.equal(input.state.applied[0], -1);
assert.equal(match.simulationTick, before + 1);
for (let i = 0; i < 6; i++) input.advance(match, 10);
assert.equal(
  input.state.applied[0],
  5,
  "Hit freeze retains input until consumed",
);
const stats = (a) => {
  a = [...a].sort((a, b) => a - b);
  return {
    p50: a[Math.floor(a.length * 0.5)] ?? 0,
    p95: a[Math.floor(a.length * 0.95)] ?? 0,
    max: a.at(-1) ?? 0,
  };
};
function trace(rtt, optimized) {
  const authority = server(),
    client = new Match(options),
    predictor = new Prediction();
  client.start();
  const incoming = [],
    outgoing = [];
  let seq = 0,
    lastSent = 0,
    lastArrival = 0,
    lastPacketAt = 0,
    lastPredictedAt = 0,
    current = {},
    remote = {},
    eventCursor = 0,
    epoch = -1,
    attackCount = 0;
  const corrections = [],
    response = [],
    pendingResponses = [];
  let previousX = client.fighters[0].x;
  for (let now = 0; now < 14000; now += 10) {
    // Same directional and rapid-tap trace, jitter and FIFO stalls for both algorithms.
    if (now % 500 === 0) {
      current = {
        unified: true,
        [now % 2000 < 1000 ? "right" : "left"]: true,
        light: now % 1500 === 0,
        pressIds: { light: Math.floor(now / 1500) + 1 },
        pressDirections: { light: {} },
      };
      seq++;
      lastSent = Math.max(
        lastSent,
        now + rtt / 2 + ((seq * 17) % 11) - 5 + (seq % 9 === 0 ? 250 : 0),
      );
      outgoing.push({ at: lastSent, seq, input: structuredClone(current) });
      if (optimized) predictor.record(client, 0, seq, current, now);
      if (now > 3000) pendingResponses.push(now);
    }
    while (outgoing.length && outgoing[0].at <= now) {
      const e = outgoing.shift();
      authority.input(0, e.seq, JSON.stringify(e.input));
    }
    authority.advance(10, now);
    if (now % 20 === 0) {
      const value = packet(authority);
      lastArrival = Math.max(
        lastArrival,
        now +
          rtt / 2 +
          (((now / 20) * 17) % 11) -
          5 +
          (now % 1800 === 0 ? 250 : 0),
      );
      incoming.push({ at: lastArrival, p: value });
    }
    while (incoming.length && incoming[0].at <= now) {
      const { p } = incoming.shift();
      const before = client.fighters[0].x;
      if (optimized) predictor.receive(client, p, 0, now, rtt);
      else {
        Object.assign(client, structuredClone(p.state));
        client.events = [];
        remote = p.inputs[1];
      }
      lastPacketAt = lastPredictedAt = now;
      if (now > 3000 && client.phase === "fighting")
        corrections.push(Math.abs(client.fighters[0].x - before));
      if (p.epoch !== epoch) {
        eventCursor = 0;
        epoch = p.epoch;
      }
      for (const e of p.events)
        if (e.id > eventCursor) {
          if (e.event.type === "attack") attackCount++;
          eventCursor = e.id;
        }
    }
    const beforeTick = client.inputTick;
    if (optimized) predictor.advance(client, now, 10);
    else if (now - lastPacketAt < 100) {
      client.advance(Math.min(10, now - lastPredictedAt), current, remote);
      lastPredictedAt = now;
    }
    client.drainEvents();
    if (
      client.inputTick !== beforeTick &&
      client.fighters[0].x !== previousX &&
      pendingResponses.length
    ) {
      response.push(now - pendingResponses.shift());
    }
    previousX = client.fighters[0].x;
  }
  // With all inputs delivered and no further prediction, a fresh authority restores exact state.
  const final = packet(authority);
  predictor.receive(client, final, 0, 15000, 0);
  predictor.reset();
  predictor.receive(client, final, 0, 15001, 0);
  assert.deepEqual(client.fighters, final.state.fighters);
  assert(predictor.stale(15500));
  return {
    rtt,
    optimized,
    correctionPx: stats(corrections),
    inputMotionMs: stats(response),
    attackCount,
  };
}
const traces = [20, 80, 150].flatMap((rtt) => [
  trace(rtt, false),
  trace(rtt, true),
]);
for (let i = 0; i < traces.length; i += 2) {
  assert.equal(traces[i].attackCount, traces[i + 1].attackCount);
  assert(traces[i + 1].correctionPx.p50 <= traces[i].correctionPx.p50);
  assert(traces[i + 1].correctionPx.max <= traces[i].correctionPx.max);
}
const bounded = new Prediction(),
  boundedMatch = new Match(options);
boundedMatch.start();
bounded.receive(boundedMatch, packet(s), 0, 10000, 150);
bounded.record(boundedMatch, 0, 100, { right: true }, 10001);
bounded.record(boundedMatch, 0, 101, { left: true }, 13002);
assert(
  bounded.stale(13002),
  "History overflow freezes prediction until resynchronization",
);
bounded.receive(boundedMatch, packet(s), 0, 13003, 150);
assert(!bounded.stale(13003));
await mkdir("output/lan-check", { recursive: true });
await writeFile(
  "output/lan-check/prediction.json",
  JSON.stringify(traces, null, 2),
);
console.log(JSON.stringify(traces, null, 2));
console.log(
  "Acknowledgements, tap latching, hit freeze, event retention, epochs, convergence and bounded prediction passed.",
);
