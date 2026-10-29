import { LobbyRoomMessage } from "../../../apis/rooms/LobbyRoomMessage";
import type { StatePacket } from "../../../apis/rooms/objects";
import { PauseRoomMessage } from "../../../apis/rooms/PauseRoomMessage";
import { FinishRoomMessage } from "../../../apis/rooms/FinishRoomMessage";
import { RestartRoomMessage } from "../../../apis/rooms/RestartRoomMessage";
import { RoomConnection } from "../../../apis/rooms/RoomConnection";
import { Match, MOVES, ROSTER, ROUND_END_TIMING } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type {
  Format,
  MatchConfig,
  Mode,
} from "../../../game/objects/MatchOptions";
import { Prediction } from "../../../game/Prediction";
import { normalizeBattleRules } from "../../../game/battleRules";
import { PresentationEvents } from "../../../game/PresentationEvents";
import type { GameView } from "../objects/GameView";
import { initialView } from "../objects/GameView";
import { AudioDirector } from "./AudioDirector";
import { InputController } from "./InputController";
import { NetworkDiagnostics } from "./NetworkDiagnostics";
import { PendingSimulationState } from "./PendingSimulationState";
import { presentationFor } from "./presentationFor";
import { CanvasRenderer } from "./rendering/CanvasRenderer";
import { backgroundVideoEnabled } from "./backgroundVideoEnabled";

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
  private readonly prediction = new Prediction();
  private readonly diagnostics = new NetworkDiagnostics();
  private readonly pendingState = new PendingSimulationState();
  private authoritativeMatch: Match | null = null;
  private readonly presentationEvents = new PresentationEvents();
  private request = 0;
  private disposed = false;
  private dialogWasPaused = false;
  private finishVideoMs: number | null = null;
  private finishAck: number | null = null;
  private finishAckRetry = 0;

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
      onState: (packet, wireBytes) => this.receive(packet, wireBytes),
      onInput: (seq, input, now, changed) => {
        if (this.match)
          this.prediction.record(this.match, this.lan.side, seq, input, now);
        if (changed) {
          this.diagnostics.input(now);
          this.diagnostics.inputSent(seq, now);
          if (this.match && (input.left || input.right || input.jump))
            this.diagnostics.motionInput(
              now,
              this.match.fighters[this.lan.side],
            );
        }
      },
      onDisconnect: () => {
        this.pendingState.clear();
        this.prediction.reset();
        this.renderer.resetCorrection();
        this.match?.setPaused(true);
        this.authoritativeMatch?.setPaused(true);
        this.input.clear();
        this.audio.pause(true);
        this.publishMatch();
      },
      onLobby: () => {
        this.pendingState.clear();
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
    const m = this.lan.connected
      ? (this.authoritativeMatch ?? this.match)
      : this.match;
    this.publish({
      fighters: m.fighters.map((f) => ({
        character: f.character,
        hp: f.hp,
        lifesteal: f.lifesteal ? { ...f.lifesteal } : null,
        // Display one decimal without implying an unavailable spend threshold.
        energy: Math.floor(f.energy * 10) / 10,
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
      finishVideoMs: m.roundEnd?.finisher ? this.finishVideoMs : null,
      teamRemaining: m.isTeamBattle ? m.teamRemaining : [1, 1],
      respawnMs: [...m.respawnMs],
      eliminated: [...m.eliminated],
    });
  }
  begin(mode: Mode, format: Format = "1v1") {
    this.publish({
      screen: "selection",
      config: {
        mode,
        format,
        characters: format === "3ffa" ? [0, 1, 2] : [0, 1],
        rules: this.view.config?.rules,
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
    this.pendingState.clear();
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
    config = {
      ...config,
      mode: !network && config.format === "3ffa" ? "cpu" : config.mode,
      rules: normalizeBattleRules(config.rules, config.format, ROSTER.length),
    };
    if (network)
      config = {
        ...config,
        settings: { ...config.settings, sound: this.view.sound },
      };
    const request = ++this.request;
    this.pendingState.clear();
    this.diagnostics.reset();
    this.publish({
      screen: "loadingBattle",
      config,
      error: "",
      lastMove: "",
      cutins: Array.from(
        { length: config.format === "3ffa" ? 3 : 2 },
        () => null,
      ),
      dialog: null,
    });
    this.audio.stop();
    this.input.clear();
    void this.audio.unlock(config.settings.sound);
    this.finishVideoMs = null;
    this.finishAck = null;
    this.finishAckRetry = 0;
    try {
      await this.renderer.prepare(config);
      // Selection or lobby changes can supersede an in-flight image preload.
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
      // Critical artwork is ready; warm only selected-character audio during READY.
      void this.audio.prepare(this.match);
      this.lastTime = performance.now();
      this.prediction.reset();
      this.authoritativeMatch = null;
      this.presentationEvents.reset();
      this.publish({ connectionStalled: false });
      this.renderer.resetCorrection();
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
    this.authoritativeMatch?.setPaused(paused);
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
      this.publish({ error: "" });
      return true;
    } catch (error) {
      this.publish({
        error: error instanceof Error ? error.message : "操作失败",
      });
      return false;
    }
  }
  private sendInput(force = false) {
    if (this.lan?.active)
      this.lan.sendInput(this.match?.paused ? {} : this.input.input(0), force);
  }

  private receive(packet: StatePacket, wireBytes: number) {
    if (!this.match || this.view.screen !== "battle") return;
    const now = performance.now();
    this.diagnostics.acknowledge(
      packet.inputState.received,
      packet.inputState.applied,
      this.lan.side,
      now,
    );
    if (this.diagnostics.enabled)
      this.diagnostics.snapshot(now, packet.serverUpdateMs, wireBytes);
    this.pendingState.push(packet, now);
  }
  private applyState(packet: StatePacket, receivedAt: number) {
    if (!this.match || this.view.screen !== "battle") return;
    const now = performance.now();
    const before = this.renderer.positions(this.match);
    const priorPhase = this.authoritativeMatch?.phase;
    const priorPause = this.authoritativeMatch?.paused;
    const reset = this.prediction.receive(
      this.match,
      packet,
      this.lan.side,
      receivedAt,
      this.lan.rtt,
    );
    // Prediction drives visible movement; keep the server snapshot separate so
    // speculative damage and energy never appear as confirmed HUD values.
    this.authoritativeMatch = Object.assign(
      Object.create(this.match),
      packet.state,
    );
    const events = this.presentationEvents.consume(packet, now, this.lan.rtt);
    const snap =
      reset ||
      this.match.paused ||
      this.match.phase !== "fighting" ||
      events.some((e) =>
        ["blink", "roundAdvance", "teamAdvance", "result"].includes(e.type),
      );
    const correction = this.renderer.correct(this.match, before, snap);
    this.diagnostics.add("correctionPx", correction);
    this.audio.pause(this.match.paused);
    this.consume(events);
    if (this.view.lobbyOpen) this.publish({ lobbyOpen: false });
    if (
      reset ||
      priorPhase !== packet.state.phase ||
      priorPause !== packet.state.paused
    )
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
        if (media?.video && media.slot === "p" && backgroundVideoEnabled())
          this.publish({
            cutins: this.view.cutins.map((entry, i) =>
              i === side ? media : entry,
            ),
          });
      }
      if (["roundAdvance", "teamAdvance", "result"].includes(event.type)) {
        this.input.clear();
        this.publish({ cutins: this.match.fighters.map(() => null) });
      }
      if (
        ["fighterKO", "fighterRespawn", "fighterEliminated"].includes(
          event.type,
        )
      ) {
        this.clearCutin(event.side ?? 0);
        if (!this.lan.connected || event.side === this.lan.side)
          this.input.clear();
        this.publishMatch();
      }
    }
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const elapsed = Math.max(0, now - (this.lastTime || now));
    const dt = Math.min(50, elapsed);
    if (this.view.screen === "battle") this.diagnostics.add("frameMs", elapsed);
    this.lastTime = now;
    // Drain even while the lobby overlay is open: the first authority packet
    // closes it. Coalescing avoids replaying obsolete states after a slow frame.
    const pending = this.pendingState.take();
    if (pending) this.applyState(pending.packet, pending.receivedAt);
    if (this.match && this.view.screen === "battle" && !this.view.lobbyOpen) {
      const previous = this.match.inputTick;
      if (this.lan.connected) {
        this.sendInput();
        // LAN cues come from deduplicated server events in receive(). Replaying
        // inputs here advances physics without playing attacks a second time.
        if (this.lan.active) this.prediction.advance(this.match, now, dt);
        const stalled = this.lan.active && this.prediction.stale(now);
        if (stalled !== this.view.connectionStalled)
          this.publish({ connectionStalled: stalled });
      } else {
        this.match.advance(dt, this.input.input(0), this.input.input(1));
        this.consume(this.match.drainEvents());
      }
      const authority = this.lan.connected
        ? this.authoritativeMatch
        : this.match;
      if (
        authority?.roundEnd?.finisher &&
        authority.phaseMs <= ROUND_END_TIMING.total - ROUND_END_TIMING.knockout
      ) {
        const playback = this.audio.updateFinish(
          authority.roundEnd,
          dt,
          authority.paused,
        );
        this.finishVideoMs = playback.videoMs;
        if (playback.complete && !authority.paused) {
          const tick = authority.roundEnd.tick;
          if (!this.lan.connected) {
            for (let side = 0; side < this.match.playerCount; side++)
              this.match.completeFinish(side, tick);
          } else if (
            !authority.finishReady[this.lan.side] &&
            this.finishAck !== tick &&
            now >= this.finishAckRetry
          ) {
            this.finishAck = tick;
            this.finishAckRetry = now + 1000;
            void new FinishRoomMessage(this.lan.token, tick)
              .send()
              .catch(() => {
                if (this.finishAck === tick) this.finishAck = null;
              });
          }
        }
      }
      if (previous !== this.match.inputTick) {
        this.input.consumed();
        this.diagnostics.simulated(now);
      }
      if (this.lan.active)
        this.diagnostics.motion(
          now,
          this.renderer.positions(this.match)[this.lan.side],
        );
      this.renderer.draw(
        this.match,
        dt,
        this.view.cutins.some((media) => !!media?.video),
        this.lan.connected ? this.authoritativeMatch : null,
      );
      if (now - this.lastPublish >= 1000 / 30) {
        this.lastPublish = now;
        this.publishMatch();
      }
    }
    if (this.diagnostics.report(now))
      this.publish({ diagnostics: this.diagnostics.text });
    this.frameId = requestAnimationFrame(this.frame);
  };
  dispose() {
    this.disposed = true;
    this.pendingState.clear();
    this.request++;
    cancelAnimationFrame(this.frameId);
    this.lan.dispose();
    this.input.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }
}
