/** Real Scala-server load test. Node 22+, run after npm start.
 * LAN_URL=http://127.0.0.1:8080 node tests/lan_load.mjs baseline|optimized
 * Delays are FIFO, modelling TCP head-of-line stalls rather than reordering messages.
 */
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
const base = process.env.LAN_URL ?? "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (a) => {
  const s = [...a].sort((a, b) => a - b);
  return {
    n: s.length,
    p50: s[Math.floor(s.length * 0.5)] ?? 0,
    p95: s[Math.floor(s.length * 0.95)] ?? 0,
    max: s.at(-1) ?? 0,
  };
};
const post = async (name, data = {}) => {
  const r = await fetch(`${base}/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw Error(`${name}: ${await r.text()}`);
  return r.json();
};
function fifo(delay, fn) {
  let due = 0,
    count = 0;
  const pending = new Set();
  return {
    send(value) {
      const jitter = ((++count * 17) % 11) - 5;
      due = Math.max(
        due,
        performance.now() + delay + jitter + (count % 180 === 0 ? 250 : 0),
      );
      const timer = setTimeout(
        () => {
          pending.delete(timer);
          fn(value);
        },
        Math.max(0, due - performance.now()),
      );
      pending.add(timer);
    },
    close() {
      pending.forEach(clearTimeout);
    },
  };
}
async function run(rooms, rtt) {
  const clients = [],
    errors = [],
    gaps = [],
    updates = [],
    bytes = [],
    sessions = [];
  let collecting = false;
  try {
    for (let room = 0; room < rooms; room++) {
      const host = await post("createroom");
      const guest = await post("joinroom", { code: host.room.code });
      for (const session of [host, guest]) {
        sessions.push(session);
        const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
        let last = 0,
          seq = 0,
          states = 0;
        const c = {
          ws,
          session,
          get states() {
            return states;
          },
        };
        clients.push(c);
        c.out = fifo(rtt / 2, (packet) => {
          if (ws.readyState === 1) ws.send(JSON.stringify(packet));
        });
        c.in = fifo(rtt / 2, (packet) => {
          if (packet.type === "state") {
            states++;
            if (collecting) {
              const now = performance.now();
              if (last) gaps.push(now - last);
              last = now;
              bytes.push(Buffer.byteLength(JSON.stringify(packet)));
              if (packet.data.serverUpdateMs !== undefined)
                updates.push(packet.data.serverUpdateMs);
            }
          }
        });
        ws.addEventListener("message", (e) => {
          const p = JSON.parse(e.data);
          if (p.type === "prepare")
            post("loadedroom", {
              token: session.token,
              generation: p.data.generation,
            }).catch((e) => errors.push(String(e)));
          if (p.type === "error") errors.push(p.data.message);
          c.in.send(p);
        });
        await new Promise((resolve, reject) => {
          ws.addEventListener("open", resolve, { once: true });
          ws.addEventListener("error", reject, { once: true });
        });
        ws.send(
          JSON.stringify({
            type: "authenticate",
            token: session.token,
            protocol: 3,
          }),
        );
        c.heartbeat = setInterval(
          () =>
            ws.readyState === 1 &&
            ws.send(
              JSON.stringify({ type: "ping", sentAt: performance.now() }),
            ),
          1000,
        );
        c.input = setInterval(() => {
          const n = ++seq;
          c.out.send({
            type: "input",
            seq: n,
            input: {
              unified: true,
              [n % 100 < 50 ? "right" : "left"]: true,
              light: n % 12 === 0,
              pressIds: { light: Math.floor(n / 12) },
              pressDirections: { light: {} },
            },
          });
        }, 50);
      }
      await sleep(100);
      await post("readyroom", { token: host.token, ready: true });
      await post("readyroom", { token: guest.token, ready: true });
    }
    await sleep(3500);
    collecting = true;
    await sleep(Number(process.env.LAN_SAMPLE_MS ?? 6000));
    if (clients.some((c) => !c.states))
      errors.push("A client received no snapshots");
    const report = {
      rooms,
      players: rooms * 2,
      rtt,
      frames: stats(gaps),
      serverUpdateMs: stats(updates),
      snapshotBytes: stats(bytes),
      outgoingBytesPerSecond: Math.round(
        bytes.reduce((sum, value) => sum + value, 0) /
          (Number(process.env.LAN_SAMPLE_MS ?? 6000) / 1000),
      ),
      errors,
    };
    console.log(JSON.stringify(report));
    return report;
  } finally {
    for (const c of clients) {
      clearInterval(c.heartbeat);
      clearInterval(c.input);
      c.out.close();
      c.in.close();
      c.ws.close();
    }
    for (const s of sessions)
      await post("leaveroom", { token: s.token }).catch(() => {});
  }
}
const report = {
  label: process.argv[2] ?? "optimized",
  host: {
    platform: os.platform(),
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
  },
  runs: [],
};
for (const rooms of [1, 2, 4])
  for (const rtt of [20, 80, 150]) report.runs.push(await run(rooms, rtt));
await mkdir("output/lan-check", { recursive: true });
await writeFile(
  `output/lan-check/${report.label}.json`,
  JSON.stringify(report, null, 2),
);
if (report.runs.some((r) => r.errors.length)) process.exitCode = 1;
