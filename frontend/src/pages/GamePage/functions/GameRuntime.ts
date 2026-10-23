import { Match, MOVES, ROSTER } from "../../../game/engine";
import { RoomConnection } from "../../../apis/rooms/RoomConnection";
import { PauseRoomMessage } from "../../../apis/rooms/PauseRoomMessage";
import { RestartRoomMessage } from "../../../apis/rooms/RestartRoomMessage";
import { LobbyRoomMessage } from "../../../apis/rooms/LobbyRoomMessage";
import type { StatePacket } from "../../../apis/rooms/objects";
import type { Assets } from "../../../game/objects/Assets";
import type { Input } from "../../../game/objects/Input";
import type {
  MatchConfig,
  Mode,
  Format,
} from "../../../game/objects/MatchOptions";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { GameView } from "../objects/GameView";
import { initialView } from "../objects/GameView";
import { AudioDirector } from "./AudioDirector";
import { CanvasRenderer } from "./CanvasRenderer";
import { InputController } from "./InputController";
import { presentationFor } from "./presentationFor";

/** Coordinates effects at the page boundary. Combat and React rendering stay independent. */
export class GameRuntime {
  private match: Match | null = null;
  private readonly renderer: CanvasRenderer;
  private readonly audio: AudioDirector;
  readonly input: InputController;
  readonly lan: RoomConnection;
  private view: GameView = initialView;
  private listeners = new Set<() => void>();
  private frameId = 0;
  private lastTime = 0;
  private lastPublish = 0;
  private authoritativeAt = 0;
  private predictedAt = 0;
  private remoteInput: Input = {};
  private request = 0;
  private disposed = false;
  private dialogWasPaused = false;

  constructor(
    private readonly assets: Assets,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.renderer = new CanvasRenderer(assets, canvas);
    this.audio = new AudioDirector(assets);
    this.input = new InputController(
      () => this.sendInput(true),
      () => {
        if (this.view.screen === "battle" && this.match && !this.match.paused)
          void this.pause(true);
      },
      () => this.showDialog("moves"),
    );
    this.lan = new RoomConnection({
      onView: (network) => this.publish({ network }),
      onPrepare: (config) => this.start(config, true),
      onState: (packet) => this.receive(packet),
      onDisconnect: () => {
        this.match?.setPaused(true);
        this.input.clear();
        this.audio.pause(true);
        this.publishMatch();
      },
      onLobby: () => {
        this.request++;
        this.match = null;
        this.audio.stop();
        this.input.clear();
        this.publish({
          screen: "menu",
          phase: "idle",
          fighters: [],
          roundEnd: null,
          lobbyOpen: this.lan.connected,
          cutins: [null, null],
        });
      },
    });
    if (this.lan.restore()) this.publish({ lobbyOpen: true });
    this.frameId = requestAnimationFrame(this.frame);
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.view;
  private publish(changes: Partial<GameView>) {
    if (this.disposed) return;
    this.view = { ...this.view, ...changes };
    this.listeners.forEach((listener) => listener());
  }
  private publishMatch() {
    if (!this.match) return;
    const m = this.match;
    this.publish({
      fighters: m.fighters.map((f) => ({
        character: f.character,
        hp: f.hp,
        energy: f.energy,
        combo: f.combo,
        beats: f.beats,
        transformed: !!(f.stageForm || f.penguin),
        name: f.penguin ? "凑企鹅" : ROSTER[f.character].name,
        color: ROSTER[f.character].color,
      })),
      phase: m.phase,
      paused: m.paused,
      remaining: m.remaining,
      round: m.round,
      wins: [...m.wins],
      reason: m.reason,
      winner: m.winner,
      roundEnd: m.roundEnd,
      phaseMs: m.phaseMs,
      teamRemaining: m.isTeamBattle ? m.teamRemaining : [1, 1],
    });
  }
  begin(mode: Mode, format: Format = "1v1") {
    this.publish({
      screen: "selection",
      config: {
        mode,
        format,
        characters: [0, 1],
        settings: this.view.config?.settings ?? {
          arena: 0,
          difficulty: 1,
          terrain: true,
          sound: this.view.sound,
          dummy: "idle",
        },
      },
      error: "",
    });
  }
  openLobby() {
    this.publish({ lobbyOpen: true, error: "" });
    void this.audio.unlock(this.view.sound);
  }
  closeLobby() {
    void this.lan.leave();
    this.publish({ lobbyOpen: false });
  }
  back() {
    this.input.clear();
    this.audio.stop();
    this.match?.setPaused(true);
    if (this.lan.connected) {
      void this.runCommand(new LobbyRoomMessage(this.lan.token).send());
      return;
    }
    this.publish({ screen: "menu", dialog: null, cutins: [null, null] });
  }
  async start(config: MatchConfig, network = false) {
    const request = ++this.request;
    this.publish({
      screen: "loadingBattle",
      config,
      error: "",
      lastMove: "",
      cutins: [null, null],
      dialog: null,
    });
    this.audio.stop();
    this.input.clear();
    void this.audio.unlock(config.settings.sound);
    try {
      await this.renderer.prepare(config);
      if (this.disposed || request !== this.request) return;
      this.match = new Match({
        ...config,
        difficulty: config.settings.difficulty,
        dummy: config.settings.dummy,
        terrain: config.settings.terrain
          ? this.assets.stages[config.settings.arena].terrain
          : null,
      });
      this.match.start();
      this.lastTime = performance.now();
      this.remoteInput = {};
      this.audio.pause(false);
      this.publish({
        screen: "battle",
        lobbyOpen: network,
        sound: config.settings.sound,
      });
      this.publishMatch();
      this.canvas.focus({ preventScroll: true });
    } catch (error) {
      if (request !== this.request) return;
      this.publish({
        screen: network ? "menu" : "selection",
        error: error instanceof Error ? error.message : "无法开始对战",
      });
      if (network) throw error;
    }
  }
  async restart() {
    if (this.lan.connected)
      return this.runCommand(new RestartRoomMessage(this.lan.token).send());
    if (this.view.config) await this.start(this.view.config);
  }
  resume() {
    this.publish({ screen: "battle" });
    void this.pause(false);
    this.canvas.focus();
  }
  async pause(paused = !this.match?.paused) {
    this.input.clear();
    if (this.lan.connected) {
      try {
        await new PauseRoomMessage(this.lan.token, paused).send();
      } catch (error) {
        this.publish({
          error: error instanceof Error ? error.message : "暂停失败",
        });
        return;
      }
    }
    this.match?.setPaused(paused);
    this.audio.pause(paused);
    this.publishMatch();
    if (!paused) this.canvas.focus({ preventScroll: true });
  }
  setSound(value: boolean) {
    this.publish({
      sound: value,
      config: this.view.config
        ? {
            ...this.view.config,
            settings: { ...this.view.config.settings, sound: value },
          }
        : null,
    });
    void this.audio.unlock(value);
  }
  showDialog(dialog: "help" | "moves") {
    this.dialogWasPaused = this.match?.paused ?? true;
    if (this.view.screen === "battle") void this.pause(true);
    this.publish({ dialog });
  }
  closeDialog() {
    this.publish({ dialog: null });
    if (this.view.screen === "battle" && !this.dialogWasPaused)
      void this.pause(false);
  }
  clearCutin(side: number) {
    this.publish({
      cutins: this.view.cutins.map((entry, i) => (i === side ? null : entry)),
    });
  }
  async runCommand(command: Promise<unknown>) {
    try {
      await command;
    } catch (error) {
      this.publish({
        error: error instanceof Error ? error.message : "操作失败",
      });
    }
  }
  private sendInput(force = false) {
    if (this.lan?.active)
      this.lan.sendInput(this.match?.paused ? {} : this.input.input(0), force);
  }

  private receive(packet: StatePacket) {
    if (!this.match || this.view.screen !== "battle") return;
    const fighters = this.match.fighters;
    Object.assign(this.match, packet.state);
    this.match.fighters = packet.state.fighters.map((state, side) =>
      Object.assign(fighters[side], state),
    );
    this.match.events = [];
    this.remoteInput = packet.inputs[1 - this.lan.side] ?? {};
    this.authoritativeAt = this.predictedAt = performance.now();
    this.audio.pause(this.match.paused);
    this.consume(packet.events);
    if (this.view.lobbyOpen) this.publish({ lobbyOpen: false });
    this.publishMatch();
  }
  private consume(events: CombatEvent[]) {
    if (!this.match) return;
    this.renderer.consume(this.match, events);
    this.audio.consume(this.match, events);
    for (const event of events) {
      if (event.type === "attack" && event.attack) {
        this.publish({ lastMove: MOVES[event.attack]?.name ?? "" });
        const side = event.side ?? 0,
          media = presentationFor(
            this.assets,
            this.match.fighters[side],
            event.attack,
          );
        if (media?.video && media.slot === "p")
          this.publish({
            cutins: this.view.cutins.map((entry, i) =>
              i === side ? media : entry,
            ),
          });
      }
      if (["roundAdvance", "teamAdvance", "result"].includes(event.type)) {
        this.input.clear();
        this.publish({ cutins: [null, null] });
      }
    }
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(50, Math.max(0, now - (this.lastTime || now)));
    this.lastTime = now;
    if (this.match && this.view.screen === "battle" && !this.view.lobbyOpen) {
      const previous = this.match.inputTick;
      if (this.lan.connected) {
        this.sendInput();
        // Predict between authoritative packets. Only server events produce sound or cutins.
        if (this.lan.active && now - this.authoritativeAt < 100) {
          const input = this.match.paused ? {} : this.input.input(0);
          this.match.advance(
            Math.min(dt, Math.max(0, now - this.predictedAt)),
            ...(this.lan.side === 0
              ? ([input, this.remoteInput] as const)
              : ([this.remoteInput, input] as const)),
          );
          this.predictedAt = now;
          this.match.drainEvents();
        }
      } else {
        this.match.advance(dt, this.input.input(0), this.input.input(1));
        this.consume(this.match.drainEvents());
      }
      if (previous !== this.match.inputTick) this.input.consumed();
      this.renderer.draw(this.match, dt);
      if (now - this.lastPublish > 32) {
        this.lastPublish = now;
        this.publishMatch();
      }
    }
    this.frameId = requestAnimationFrame(this.frame);
  };
  dispose() {
    this.disposed = true;
    this.request++;
    cancelAnimationFrame(this.frameId);
    this.lan.dispose();
    this.input.dispose();
    this.audio.dispose();
    this.listeners.clear();
  }
}
