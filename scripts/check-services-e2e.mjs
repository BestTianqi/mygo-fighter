import { closeSync, existsSync, openSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  delay,
  ensureStaged,
  killServices,
  lobbyPort,
  projectRoot,
  removeServicesFile,
  requireFreePort,
  roomsPort,
  serviceEnvironments,
  startService,
  waitFor,
  waitForJson,
  waitForServicesExit,
  writeServicesFile,
} from "./services-process.mjs";

// End-to-end proof for the three-process backend: public traffic enters the
// edge, room placement goes through the lobby, and the authoritative room
// simulation stays inside one rooms process. Two rooms run concurrently so a
// placement or directory regression cannot hide behind a single room.
const PROTOCOL = 25;
const EDGE_PORT = 18080;
const LOBBY_PORT = 18079;
const ROOMS_PORT = 18091;
const MAX_ROOMS = 20;
const BASE_URL = `http://127.0.0.1:${EDGE_PORT}`;
const REPORT_DIRECTORY = path.join(projectRoot, "output/services-e2e");
const REPORT_FILE = path.join(REPORT_DIRECTORY, "report.json");
const LOG_DIRECTORY = path.join(REPORT_DIRECTORY, "logs");
const INPUT_ACTIONS = ["right", "left", "jump", "light", "heavy", "skill1"];
const FLOW_TIMEOUT = 30000;

const report = {
  ok: false,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  protocol: PROTOCOL,
  ports: { edge: EDGE_PORT, lobby: LOBBY_PORT, rooms: ROOMS_PORT },
  stage: null,
  checks: [],
  rooms: [],
  logs: {},
  failure: null,
};
const services = [];
const sockets = new Set();
const logDescriptors = [];

function recordCheck(name, ok, detail) {
  report.checks.push({ name, ok: Boolean(ok), detail: detail ?? null });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  return ok;
}

function assertCheck(name, condition, detail) {
  if (!recordCheck(name, condition, detail))
    throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
}

async function postAPI(name, body) {
  const response = await fetch(`${BASE_URL}/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}
  if (!response.ok) {
    const detail =
      payload && typeof payload.error === "string" ? `: ${payload.error}` : "";
    throw new Error(
      `POST /api/${name} failed with HTTP ${response.status}${detail}`,
    );
  }
  if (payload === null)
    throw new Error(`POST /api/${name} returned invalid JSON.`);
  return payload;
}

// Room placement and directory registration settle asynchronously across
// processes, so the first create/join may race a heartbeat. The browser retries
// through reconnects; the check retries the two placement calls explicitly.
async function postAPIWithRetry(name, body, attempts = 15) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await postAPI(name, body);
    } catch (error) {
      lastError = error;
      await delay(400);
    }
  }
  throw lastError;
}

function connectRoom(code, token, label) {
  const socket = new WebSocket(
    `ws://127.0.0.1:${EDGE_PORT}/ws?room=${encodeURIComponent(code)}`,
  );
  const messages = [];
  const errors = [];
  const waiters = new Set();
  let ping = null;
  const source = {
    label,
    messages,
    errors,
    send(frame) {
      if (socket.readyState !== WebSocket.OPEN)
        throw new Error(`The ${label} socket is not open.`);
      socket.send(JSON.stringify(frame));
    },
    count(type) {
      return messages.reduce(
        (total, packet) => total + (packet?.type === type ? 1 : 0),
        0,
      );
    },
    waitFor(predicate, timeoutMs, description) {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const waiter = { predicate };
        const timer = setTimeout(() => {
          waiters.delete(waiter);
          reject(new Error(`Timed out waiting for ${description}.`));
        }, timeoutMs);
        waiter.resolve = (packet) => {
          clearTimeout(timer);
          resolve(packet);
        };
        waiter.reject = (error) => {
          clearTimeout(timer);
          reject(error);
        };
        waiters.add(waiter);
      });
    },
    close() {
      clearInterval(ping);
      sockets.delete(source);
      try {
        socket.close();
      } catch {}
    },
  };
  socket.addEventListener("message", (event) => {
    let packet;
    try {
      packet = JSON.parse(String(event.data));
    } catch {
      errors.push(`unparseable frame: ${String(event.data).slice(0, 100)}`);
      return;
    }
    if (packet?.type === "error")
      errors.push(String(packet?.data?.message ?? "error frame"));
    messages.push(packet);
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(packet)) continue;
      waiters.delete(waiter);
      waiter.resolve(packet);
    }
  });
  socket.addEventListener("close", () => {
    for (const waiter of [...waiters]) {
      waiters.delete(waiter);
      waiter.reject(new Error(`The ${label} socket closed unexpectedly.`));
    }
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out opening the ${label} socket.`)),
      10000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        // Room peers are considered gone without traffic; the browser sends a
        // heartbeat every second, so the check mirrors that cadence.
        ping = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
        }, 700);
        ping.unref?.();
        sockets.add(source);
        source.send({ type: "authenticate", protocol: PROTOCOL, token });
        resolve(source);
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error(`Could not open the ${label} socket.`));
      },
      { once: true },
    );
  });
}

async function runRoom(label) {
  const room = {
    label,
    ok: false,
    code: null,
    generation: null,
    prepareFrames: 0,
    stateFrames: null,
    inputs: 0,
    errors: [],
    checks: [],
  };
  const check = (name, condition, detail) => {
    const ok = Boolean(condition);
    room.checks.push({ name, ok, detail: detail ?? null });
    console.log(
      `  ${ok ? "PASS" : "FAIL"} room ${label} ${name}${detail ? `: ${detail}` : ""}`,
    );
    if (!ok)
      throw new Error(`room ${label} ${name}${detail ? `: ${detail}` : ""}`);
  };
  let hostSocket = null;
  let guestSocket = null;
  try {
    const hostSession = await postAPIWithRetry("createroom", {});
    check(
      "createroom",
      Boolean(hostSession?.token && hostSession?.room?.code),
      `code ${hostSession?.room?.code}`,
    );
    room.code = hostSession.room.code;
    const guestSession = await postAPIWithRetry("joinroom", {
      code: room.code,
    });
    check(
      "joinroom",
      Boolean(guestSession?.token) && guestSession?.side !== hostSession?.side,
      `sides ${hostSession?.side}/${guestSession?.side}`,
    );
    const tokenFormat = /^[A-F0-9]{6}\.[A-F0-9]{48}$/;
    check(
      "session tokens",
      tokenFormat.test(hostSession.token) &&
        tokenFormat.test(guestSession.token),
      "6-character room code plus session nonce",
    );

    hostSocket = await connectRoom(
      room.code,
      hostSession.token,
      `room ${label} host`,
    );
    guestSocket = await connectRoom(
      room.code,
      guestSession.token,
      `room ${label} guest`,
    );
    const bothConnected = (packet) =>
      packet?.type === "room" &&
      Array.isArray(packet.data?.players) &&
      packet.data.players.filter(Boolean).length === 2 &&
      packet.data.players.filter(Boolean).every((player) => player.connected);
    await hostSocket.waitFor(
      (packet) => packet?.type === "room",
      FLOW_TIMEOUT,
      "the host room frame",
    );
    await hostSocket.waitFor(
      bothConnected,
      FLOW_TIMEOUT,
      "both players to be connected",
    );
    await guestSocket.waitFor(
      (packet) => packet?.type === "room",
      FLOW_TIMEOUT,
      "the guest room frame",
    );
    await guestSocket.waitFor(
      bothConnected,
      FLOW_TIMEOUT,
      "both players to be connected",
    );
    check("websocket authenticate", true, "room frames received");

    await postAPI("chooseroom", {
      token: hostSession.token,
      format: "1v1",
      character: hostSession.side,
      arena: 0,
      terrain: true,
    });
    await postAPI("chooseroom", {
      token: guestSession.token,
      character: guestSession.side,
    });
    check("chooseroom", true, "1v1 with selected characters");

    await postAPI("readyroom", { token: hostSession.token, ready: true });
    await postAPI("readyroom", { token: guestSession.token, ready: true });
    const hostPrepare = await hostSocket.waitFor(
      (packet) => packet?.type === "prepare",
      FLOW_TIMEOUT,
      "the host prepare frame",
    );
    const guestPrepare = await guestSocket.waitFor(
      (packet) => packet?.type === "prepare",
      FLOW_TIMEOUT,
      "the guest prepare frame",
    );
    room.prepareFrames = 2;
    room.generation = hostPrepare?.data?.generation ?? null;
    check(
      "prepare",
      Number.isInteger(room.generation) &&
        room.generation === guestPrepare?.data?.generation,
      `generation ${room.generation}`,
    );

    await postAPI("loadedroom", {
      token: hostSession.token,
      generation: hostPrepare.data.generation,
      peerId: hostPrepare.data.peerId,
    });
    await postAPI("loadedroom", {
      token: guestSession.token,
      generation: guestPrepare.data.generation,
      peerId: guestPrepare.data.peerId,
    });
    await hostSocket.waitFor(
      (packet) => packet?.type === "state",
      FLOW_TIMEOUT,
      "the host state frame",
    );
    await guestSocket.waitFor(
      (packet) => packet?.type === "state",
      FLOW_TIMEOUT,
      "the guest state frame",
    );
    check("state frames", true, "simulation started for both clients");
    const statesBefore = hostSocket.count("state") + guestSocket.count("state");

    for (let seq = 1; seq <= 20; seq++) {
      const target = seq % 2 === 0 ? hostSocket : guestSocket;
      target.send({
        type: "input",
        seq,
        input: { [INPUT_ACTIONS[(seq - 1) % INPUT_ACTIONS.length]]: true },
      });
    }
    room.inputs = 20;
    await waitFor(
      () =>
        hostSocket.count("state") + guestSocket.count("state") >
        statesBefore + 3,
      {
        label: `room ${label} state frames after input`,
        timeoutMs: 10000,
        intervalMs: 100,
      },
    );
    await delay(500);
    room.stateFrames = {
      host: hostSocket.count("state"),
      guest: guestSocket.count("state"),
    };
    room.errors = [...hostSocket.errors, ...guestSocket.errors];
    check(
      "state frames after input",
      room.stateFrames.host > 0 && room.stateFrames.guest > 0,
      `host ${room.stateFrames.host}, guest ${room.stateFrames.guest}`,
    );
    check(
      "no error frames",
      room.errors.length === 0,
      room.errors.length > 0 ? room.errors.join("; ") : "none",
    );
    room.ok = true;
    return room;
  } catch (error) {
    room.ok = false;
    room.error = error.message;
    return room;
  } finally {
    hostSocket?.close();
    guestSocket?.close();
  }
}

try {
  await mkdir(LOG_DIRECTORY, { recursive: true });
  for (const candidate of [EDGE_PORT, LOBBY_PORT, ROOMS_PORT])
    await requireFreePort(
      candidate,
      `Port ${candidate} is already in use. Stop running services before the e2e check.`,
    );
  assertCheck(
    "test ports are free",
    true,
    `${EDGE_PORT}, ${LOBBY_PORT}, ${ROOMS_PORT}`,
  );

  if (
    !existsSync(
      path.join(projectRoot, "backend/src/main/resources/simulation.js"),
    )
  )
    throw new Error(
      "backend/src/main/resources/simulation.js is missing. Run npm run build first.",
    );

  const built = await ensureStaged();
  report.stage = built ? "built" : "reused";
  assertCheck("staged backend is available", true, report.stage);

  const environments = serviceEnvironments({
    edgePort: EDGE_PORT,
    rooms: ROOMS_PORT,
    lobby: LOBBY_PORT,
    host: "127.0.0.1",
    maxRooms: MAX_ROOMS,
    heartbeatIntervalMs: 250,
  });
  for (const { role, port, env } of environments) {
    const logPath = path.join(LOG_DIRECTORY, `${role}.log`);
    const descriptor = openSync(logPath, "w");
    logDescriptors.push(descriptor);
    report.logs[role] = path.relative(projectRoot, logPath);
    services.push(
      startService({
        role,
        port,
        env,
        stdio: ["ignore", descriptor, descriptor],
      }),
    );
  }
  await writeServicesFile(services);
  assertCheck(
    "services started",
    true,
    `rooms :${ROOMS_PORT}, lobby :${LOBBY_PORT}, edge :${EDGE_PORT}`,
  );

  await waitForJson(
    `http://127.0.0.1:${ROOMS_PORT}/internal/health`,
    (body) => body?.role === "rooms",
    {
      label: "the rooms health endpoint",
      timeoutMs: 90000,
      services,
    },
  );
  assertCheck("rooms health", true);
  await waitForJson(
    `http://127.0.0.1:${LOBBY_PORT}/internal/health`,
    (body) => body?.role === "lobby",
    {
      label: "the lobby health endpoint",
      timeoutMs: 90000,
      services,
    },
  );
  assertCheck("lobby health", true);
  await waitForJson(
    `${BASE_URL}/api/health`,
    (body) => body?.app === "mygo-scala",
    {
      label: "the edge health endpoint",
      timeoutMs: 90000,
      services,
    },
  );
  assertCheck("edge health", true, "app=mygo-scala");
  await waitForJson(
    `http://127.0.0.1:${LOBBY_PORT}/internal/health`,
    (body) => Number(body?.instances) >= 1,
    {
      label: "the rooms instance to register with the lobby",
      timeoutMs: 30000,
      services,
    },
  );
  assertCheck("rooms instance registered with the lobby", true);

  const settled = await Promise.allSettled([runRoom("A"), runRoom("B")]);
  report.rooms = settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") return outcome.value;
    return {
      label: index === 0 ? "A" : "B",
      ok: false,
      error: String(outcome.reason?.message ?? outcome.reason),
    };
  });
  for (const room of report.rooms) {
    recordCheck(
      `room ${room.label} full flow`,
      room.ok,
      room.ok
        ? `code ${room.code}, generation ${room.generation}, ` +
            `state frames ${room.stateFrames?.host}/${room.stateFrames?.guest}, ${room.inputs} inputs`
        : room.error,
    );
  }
  if (report.rooms.some((room) => !room.ok))
    throw new Error("At least one room flow failed.");
  assertCheck(
    "two rooms run in parallel",
    report.rooms.length === 2 &&
      report.rooms.every((room) => room.ok) &&
      report.rooms[0].code !== report.rooms[1].code,
    report.rooms.map((room) => room.code).join(", "),
  );
} catch (error) {
  report.failure = error.message;
  console.error(`FAIL ${error.message}`);
} finally {
  for (const socket of [...sockets]) {
    try {
      socket.close();
    } catch {}
  }
  killServices(services, "SIGTERM");
  if (!(await waitForServicesExit(services, 8000))) {
    console.error("Services did not stop in time; forcing them down.");
    killServices(services, "SIGKILL");
    await waitForServicesExit(services, 5000);
  }
  for (const descriptor of logDescriptors) {
    try {
      closeSync(descriptor);
    } catch {}
  }
  await removeServicesFile().catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.ok =
    report.failure === null &&
    report.checks.length > 0 &&
    report.checks.every((check) => check.ok);
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Services e2e report written to ${path.relative(projectRoot, REPORT_FILE)}.`,
  );
}
console.log(
  report.ok ? "Services e2e check passed." : "Services e2e check failed.",
);
process.exit(report.ok ? 0 : 1);
