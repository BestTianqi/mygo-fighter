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

interface Callbacks {
  onView: (view: ConnectionView) => void;
  onPrepare: (config: MatchConfig) => Promise<void>;
  onState: (packet: StatePacket) => void;
  onDisconnect: () => void;
  onLobby: () => void;
}

/** One ordered duplex socket, with immediate input and no HTTP request per key. */
export class RoomConnection {
  private socket: WebSocket | null = null;
  private session: SessionResponse | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private disposed = false;
  private attempts = 0;
  private connectId = 0;
  private generation = -1;
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
        room: session.room,
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
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    this.socket = socket;
    this.authenticated = false;
    socket.onopen = () => {
      this.attempts = 0;
      socket.send(JSON.stringify({ type: "authenticate", token: this.token }));
      this.heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({ type: "ping", sentAt: performance.now() }),
          );
      }, 1000);
    };
    socket.onmessage = (event) => {
      if (this.socket === socket) void this.receive(String(event.data));
    };
    socket.onclose = () => {
      if (socket !== this.socket) return;
      clearInterval(this.heartbeat);
      this.prepared = false;
      if (!this.session || this.disposed) return;
      this.callbacks.onDisconnect();
      this.update({
        status: "reconnecting",
        error: "连接中断，对战已暂停。正在重连…",
      });
      this.retry = setTimeout(
        () => this.openSocket(),
        Math.min(3000, 250 * 2 ** this.attempts++),
      );
    };
    socket.onerror = () => socket.close();
  }

  private async receive(raw: string) {
    try {
      const packet = JSON.parse(raw) as { type: string; data: unknown };
      if (packet.type === "room") {
        const room = packet.data as RoomView;
        this.authenticated = true;
        const backToLobby =
          !room.playing &&
          !room.preparing &&
          ["playing", "preparing"].includes(this.view.status);
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
        };
        this.generation = data.generation;
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
        this.prepared = true;
        if (!data.resume)
          await new LoadedRoomMessage(this.token, data.generation).send();
      } else if (packet.type === "state") {
        const data = packet.data as StatePacket;
        this.seq = Math.max(this.seq, data.acks[this.side] ?? 0);
        if (!this.prepared || data.generation !== this.generation) return;
        if (this.view.status !== "playing") {
          this.lastInput = "";
          this.update({ status: "playing", error: "" });
        }
        this.callbacks.onState(data);
      } else if (packet.type === "pong") {
        const { sentAt } = packet.data as { sentAt: number };
        if (Number.isFinite(sentAt))
          this.update({ rtt: Math.round(performance.now() - sentAt) });
      } else if (packet.type === "error") {
        const { message } = packet.data as { message: string };
        if (!this.authenticated) {
          this.session = null;
          sessionStorage.removeItem("mygo-room-v2");
          this.socket?.close();
          this.update({ status: "error", room: null, error: message });
        } else this.update({ error: message });
      }
    } catch (error) {
      this.callbacks.onDisconnect();
      this.update({
        status: "error",
        error: error instanceof Error ? error.message : "联机消息无效",
      });
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
      this.socket.close();
      return;
    }
    this.lastInput = encoded;
    this.lastSent = now;
    this.socket.send(
      JSON.stringify({ type: "input", seq: ++this.seq, input: compact }),
    );
  }

  async leave() {
    const token = this.token;
    this.connectId++;
    sessionStorage.removeItem("mygo-room-v2");
    this.session = null;
    this.prepared = false;
    this.generation++;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    this.socket?.close();
    this.socket = null;
    this.update({ status: "offline", room: null, error: "", rtt: null });
    if (token) this.callbacks.onLobby();
    if (token) await new LeaveRoomMessage(token).send().catch(() => {});
  }

  dispose() {
    this.disposed = true;
    void this.leave();
  }
}
