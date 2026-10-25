import { NETWORK_PROTOCOL } from "../../game/networkProtocol";
import { compactInput } from "../../game/inputCodec";
import { CreateRoomMessage } from "./CreateRoomMessage";
import { JoinRoomMessage } from "./JoinRoomMessage";
import { LoadedRoomMessage } from "./LoadedRoomMessage";
import { LeaveRoomMessage } from "./LeaveRoomMessage";
import type {
  ConnectionView,
  RoomView,
  SessionResponse,
  StatePacket,
} from "./objects";
import type { MatchConfig } from "../../game/objects/MatchOptions";
import type { Input } from "../../game/objects/Input";

const VERSION_MISMATCH =
  "客户端与主机版本不一致，请房主重启联机服务，双方刷新页面。";

interface Callbacks {
  onView: (view: ConnectionView) => void;
  onPrepare: (config: MatchConfig) => Promise<void>;
  onState: (packet: StatePacket) => void;
  onDisconnect: () => void;
  onLobby: () => void;
  onInput: (seq: number, input: Input, now: number, changed: boolean) => void;
}

/** One ordered duplex socket, with immediate input and no HTTP request per key. */
export class RoomConnection {
  private socket: WebSocket | null = null;
  private session: SessionResponse | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private disposed = false;
  private attempts = 0;
  private connectId = 0;
  private generation = -1;
  private stateEpoch = -1;
  private stateTick = -1;
  private smoothedRtt = 0;
  private prepared = false;
  private authenticated = false;
  private seq = Date.now() * 1000;
  private lastInput = "";
  private lastSent = 0;
  private preparing: Promise<void> | null = null;
  private view: ConnectionView = {
    status: "offline",
    room: null,
    side: 0,
    rtt: null,
    error: "",
  };

  constructor(private readonly callbacks: Callbacks) {}
  get rtt() {
    return this.smoothedRtt;
  }
  get token() {
    return this.session?.token ?? "";
  }
  get side() {
    return this.session?.side ?? 0;
  }
  get active() {
    return this.view.status === "playing";
  }
  get connected() {
    return this.session !== null;
  }

  private update(changes: Partial<ConnectionView>) {
    this.view = { ...this.view, ...changes };
    this.callbacks.onView(this.view);
  }

  async connect(code?: string) {
    if (this.session || this.view.status === "connecting") return;
    const attempt = ++this.connectId;
    this.update({ status: "connecting", error: "" });
    try {
      const session = await (code
        ? new JoinRoomMessage(code.trim().toUpperCase()).send()
        : new CreateRoomMessage().send());
      if (this.disposed || attempt !== this.connectId) {
        await new LeaveRoomMessage(session.token).send();
        return;
      }
      this.session = session;
      sessionStorage.setItem("mygo-room-v2", JSON.stringify(this.session));
      this.update({ side: this.side, room: this.session.room });
      this.openSocket();
    } catch (error) {
      if (this.disposed || attempt !== this.connectId) return;
      this.update({
        status: "error",
        error: String(error instanceof Error ? error.message : error),
      });
    }
  }

  restore(): boolean {
    try {
      const saved = sessionStorage.getItem("mygo-room-v2");
      if (!saved) return false;
      const session = JSON.parse(saved) as SessionResponse;
      if (
        !/^[A-F0-9]{48}$/.test(session.token) ||
        ![0, 1].includes(session.side)
      )
        return false;
      this.session = session;
      this.update({
        status: "connecting",
        // Wait for the current server view; saved room fields may belong to an older version.
        room: null,
        side: session.side,
      });
      this.openSocket();
      return true;
    } catch {
      return false;
    }
  }

  private openSocket() {
    if (this.disposed || !this.session) return;
    clearTimeout(this.retry);
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    this.socket = socket;
    this.authenticated = false;
    this.smoothedRtt = 0;
    let receivedAt = performance.now();
    this.watchdog = setInterval(() => {
      if (socket !== this.socket) return;
      const timeout = this.authenticated ? 4000 : 6000;
      if (performance.now() - receivedAt >= timeout)
        this.reconnect(socket, "网络暂时无响应，对战已暂停。正在重连…");
    }, 1000);
    socket.onopen = () => {
      if (socket !== this.socket || !this.session || this.disposed) return;
      socket.send(
        JSON.stringify({
          type: "authenticate",
          token: this.token,
          protocol: NETWORK_PROTOCOL,
        }),
      );
      socket.send(JSON.stringify({ type: "ping", sentAt: performance.now() }));
      this.heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({ type: "ping", sentAt: performance.now() }),
          );
      }, 1000);
    };
    socket.onmessage = (event) => {
      if (this.socket === socket) {
        receivedAt = performance.now();
        void this.receive(String(event.data), socket);
      }
    };
    socket.onclose = () => this.reconnect(socket);
    socket.onerror = () => this.reconnect(socket);
  }

  private closeSocket() {
    clearInterval(this.heartbeat);
    clearInterval(this.watchdog);
    const socket = this.socket;
    this.socket = null;
    this.authenticated = this.prepared = false;
    socket?.close();
  }

  private reconnect(
    socket: WebSocket,
    error = "连接中断，对战已暂停。正在重连…",
  ) {
    if (socket !== this.socket) return;
    // Detach immediately: a broken Wi-Fi route may never finish the close handshake.
    this.closeSocket();
    if (!this.session || this.disposed) return;
    this.callbacks.onDisconnect();
    this.update({ status: "reconnecting", error, rtt: null });
    this.retry = setTimeout(
      () => this.openSocket(),
      Math.min(3000, 250 * 2 ** this.attempts++),
    );
  }

  private async receive(raw: string, socket: WebSocket) {
    try {
      const packet = JSON.parse(raw) as { type: string; data: unknown };
      if (packet.type === "room") {
        const room = packet.data as RoomView;
        this.authenticated = true;
        this.attempts = 0;
        const backToLobby =
          !room.playing &&
          !room.preparing &&
          (this.view.room?.playing ||
            this.view.room?.preparing ||
            ["playing", "preparing"].includes(this.view.status));
        this.update({
          room,
          error: "",
          status: room.preparing
            ? "preparing"
            : room.playing
              ? this.view.status
              : "lobby",
        });
        if (backToLobby) {
          this.generation = room.generation;
          this.prepared = false;
          this.callbacks.onLobby();
        }
      } else if (packet.type === "prepare") {
        const data = packet.data as {
          config: MatchConfig;
          generation: number;
          resume?: boolean;
          peerId: string;
        };
        this.generation = data.generation;
        this.stateEpoch = this.stateTick = -1;
        this.prepared = false;
        this.update({ status: "preparing", error: "" });
        const session = this.session,
          socket = this.socket;
        this.preparing = this.callbacks.onPrepare(data.config);
        await this.preparing;
        if (
          this.session !== session ||
          this.socket !== socket ||
          this.generation !== data.generation ||
          this.disposed
        )
          return;
        await new LoadedRoomMessage(
          this.token,
          data.generation,
          data.peerId,
        ).send();
        if (
          this.session === session &&
          this.socket === socket &&
          this.generation === data.generation &&
          !this.disposed
        )
          this.prepared = true;
      } else if (packet.type === "state") {
        const data = packet.data as StatePacket;
        if (data.protocol !== NETWORK_PROTOCOL) {
          this.session = null;
          sessionStorage.removeItem("mygo-room-v2");
          this.closeSocket();
          this.callbacks.onDisconnect();
          this.update({
            status: "error",
            error: VERSION_MISMATCH,
          });
          return;
        }
        this.seq = Math.max(this.seq, data.received[this.side] ?? 0);
        if (!this.prepared || data.generation !== this.generation) return;
        if (
          data.epoch < this.stateEpoch ||
          (data.epoch === this.stateEpoch && data.tick < this.stateTick)
        )
          return;
        this.stateEpoch = data.epoch;
        this.stateTick = data.tick;
        if (this.view.status !== "playing") {
          this.lastInput = "";
          this.update({ status: "playing", error: "" });
        }
        this.callbacks.onState(data);
      } else if (packet.type === "pong") {
        const { sentAt } = packet.data as { sentAt: number };
        if (Number.isFinite(sentAt)) {
          const measured = Math.max(0, performance.now() - sentAt);
          this.smoothedRtt = this.smoothedRtt
            ? this.smoothedRtt * 0.8 + measured * 0.2
            : measured;
          this.update({ rtt: Math.round(this.smoothedRtt) });
        }
      } else if (packet.type === "error") {
        const { message } = packet.data as { message: string };
        if (!this.authenticated) {
          this.session = null;
          sessionStorage.removeItem("mygo-room-v2");
          this.closeSocket();
          this.update({
            status: "error",
            room: null,
            error: message.includes("版本") ? VERSION_MISMATCH : message,
          });
        } else this.update({ error: message });
      }
    } catch (error) {
      if (socket !== this.socket || !this.session || this.disposed) return;
      this.reconnect(
        socket,
        error instanceof Error ? error.message : "联机消息无效，正在重连…",
      );
    }
  }

  sendInput(input: Input, force = false) {
    if (!this.active || this.socket?.readyState !== WebSocket.OPEN) return;
    const compact = compactInput(input);
    const encoded = JSON.stringify(compact);
    const now = performance.now();
    if (!force && encoded === this.lastInput && now - this.lastSent < 250)
      return;
    if (this.socket.bufferedAmount > 65536) {
      this.reconnect(this.socket, "网络发送拥堵，对战已暂停。正在重连…");
      return;
    }
    const changed = encoded !== this.lastInput;
    this.lastInput = encoded;
    this.lastSent = now;
    const seq = ++this.seq;
    this.socket.send(JSON.stringify({ type: "input", seq, input: compact }));
    this.callbacks.onInput(seq, compact, now, changed);
  }

  async leave() {
    const token = this.token;
    this.connectId++;
    sessionStorage.removeItem("mygo-room-v2");
    this.session = null;
    this.prepared = false;
    this.generation++;
    clearTimeout(this.retry);
    this.closeSocket();
    this.update({ status: "offline", room: null, error: "", rtt: null });
    if (token) this.callbacks.onLobby();
    if (token) await new LeaveRoomMessage(token).send().catch(() => {});
  }

  dispose() {
    this.disposed = true;
    void this.leave();
  }
}
