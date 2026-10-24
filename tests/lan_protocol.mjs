/** Lifecycle and compatibility checks against the actual Scala server. */
import assert from "node:assert/strict";
const base = process.env.LAN_URL ?? "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(name, data = {}) {
  return fetch(`${base}/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(data),
  });
}
async function ok(name, data) {
  const response = await post(name, data);
  assert(response.ok, await response.clone().text());
  return response.json();
}
async function connect(token, protocol = 3) {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws"),
    packets = [];
  ws.addEventListener("message", (e) => packets.push(JSON.parse(e.data)));
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const send = (p) => ws.send(JSON.stringify(p));
  send({ type: "authenticate", token, protocol });
  const heartbeat = setInterval(
    () =>
      ws.readyState === 1 && send({ type: "ping", sentAt: performance.now() }),
    1000,
  );
  return {
    ws,
    packets,
    send,
    close() {
      clearInterval(heartbeat);
      ws.close();
    },
    async wait(predicate) {
      for (let i = 0; i < 200; i++) {
        const found = packets.find(predicate);
        if (found) return found;
        await sleep(25);
      }
      throw Error("Timed out waiting for protocol state");
    },
  };
}
const peers = [],
  sessions = [];
try {
  const host = await ok("createroom");
  sessions.push(host);
  const guest = await ok("joinroom", { code: host.room.code });
  sessions.push(guest);
  const incompatible = await connect(host.token, 2);
  peers.push(incompatible);
  const error = await incompatible.wait((p) => p.type === "error");
  assert.match(error.data.message, /刷新/);
  incompatible.close();
  const a = await connect(host.token),
    b = await connect(guest.token);
  peers.push(a, b);
  await a.wait((p) => p.type === "room");
  await b.wait((p) => p.type === "room");
  await ok("readyroom", { token: host.token, ready: true });
  await ok("readyroom", { token: guest.token, ready: true });
  const prepare = await a.wait((p) => p.type === "prepare");
  const generation = prepare.data.generation;
  assert(
    !(
      await post("loadedroom", {
        token: host.token,
        generation: generation - 1,
      })
    ).ok,
  );
  await ok("loadedroom", { token: host.token, generation });
  await ok("loadedroom", { token: guest.token, generation });
  const first = await a.wait((p) => p.type === "state");
  assert.equal(first.data.protocol, 3);
  await a.wait((p) => p.type === "state" && p.data.state.phase === "fighting");
  a.send({ type: "input", seq: 1, input: { unified: true, right: true } });
  await a.wait((p) => p.type === "state" && p.data.acks[0] === 1);
  b.close();
  const paused = await a.wait((p) => p.type === "state" && p.data.state.paused);
  assert.deepEqual(paused.data.inputs, [{}, {}]);
  const resumedPeer = await connect(guest.token);
  peers.push(resumedPeer);
  await resumedPeer.wait((p) => p.type === "prepare" && p.data.resume);
  await ok("pauseroom", { token: host.token, paused: false });
  const resumed = await a.wait(
    (p) =>
      p.type === "state" &&
      !p.data.state.paused &&
      p.data.epoch > paused.data.epoch,
  );
  await ok("restartroom", { token: host.token });
  const restarted = await a.wait(
    (p) => p.type === "state" && p.data.epoch > resumed.data.epoch,
  );
  assert(restarted.data.tick >= resumed.data.tick);
  await ok("lobbyroom", { token: host.token });
  await a.wait((p) => p.type === "room" && p.data.generation > generation);
  assert(!(await post("loadedroom", { token: host.token, generation })).ok);
  for (const session of sessions)
    await ok("leaveroom", { token: session.token });
  assert(
    !(await post("joinroom", { code: host.room.code })).ok,
    "Empty room was removed",
  );
  console.log(
    "Version mismatch, stale generation, applied acknowledgements, disconnect/reconnect, pause, restart and room removal passed.",
  );
} finally {
  peers.forEach((p) => p.close());
  for (const session of sessions)
    await post("leaveroom", { token: session.token }).catch(() => {});
}
