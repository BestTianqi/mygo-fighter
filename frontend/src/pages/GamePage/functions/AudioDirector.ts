import { createVoicePlayer } from "./createVoicePlayer";
import type { Assets } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { Match } from "../../../game/engine";
import { presentationFor } from "./presentationFor";
import { MOVES } from "../../../game/combatData";
import { ultimateFinishFor } from "./ultimateFinishFor";
import type { RoundEnd } from "../../../game/objects/RoundEnd";

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const MAX_AUDIO_LOADS = 4;
type AudioTask = {
  name: string;
  resolve: (buffer: AudioBuffer) => void;
  reject: (error: unknown) => void;
};

/** Recorded channels are independent. Pausing retains offsets; mute and reset release them. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private voices: ReturnType<typeof createVoicePlayer> | null = null;
  private summons: ReturnType<typeof createVoicePlayer> | null = null;
  private music: ReturnType<typeof createVoicePlayer> | null = null;
  private speeches: ReturnType<typeof createVoicePlayer> | null = null;
  private enabled = true;
  private paused = false;
  private disposed = false;
  private readonly urls: Record<string, string>;
  private readonly buffers = new Map<string, AudioBuffer>();
  private bufferBytes = 0;
  private readonly pending = new Map<string, Promise<AudioBuffer>>();
  private readonly queue: AudioTask[] = [];
  private activeLoads = 0;
  private readonly abort = new AbortController();
  private finish: {
    tick: number;
    side: number;
    voice: string | undefined;
    duration: number;
    videoMs: number | null;
    complete: boolean;
    audible: boolean;
  } | null = null;

  constructor(private readonly assets: Assets) {
    this.urls = Object.fromEntries(
      Object.entries({
        ...assets.penguinVoices,
        ...assets.soyoVoices,
        ...assets.memeVoices,
        ...assets.summonVoices,
        ...assets.transformMusic,
        ...assets.finishVoices,
      }),
    );
  }

  async unlock(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      if (this.finish) this.finish.audible = false;
      this.voices?.setEnabled(false);
      this.summons?.setEnabled(false);
      this.music?.setEnabled(false);
      this.speeches?.setEnabled(false);
      return;
    }
    if (this.disposed) return;
    this.context ??= new AudioContext();
    await this.context.resume();
    if (this.disposed) return;
    const context = this.context;
    if (!this.voices) {
      const buffers = {
        get: (name: string) => this.getBuffer(name),
        load: (name: string) => this.load(name),
      };
      this.voices = createVoicePlayer(context, buffers);
      this.summons = createVoicePlayer(context, buffers);
      this.music = createVoicePlayer(context, buffers);
      this.speeches = createVoicePlayer(context, buffers);
    }
    for (const channel of [
      this.voices,
      this.summons,
      this.music,
      this.speeches,
    ]) {
      channel?.setEnabled(this.enabled);
      channel?.setPaused(this.paused);
    }
  }

  /** Warm only media reachable by the selected fighters after critical images. */
  async prepare(match: Match) {
    if (!this.enabled || this.disposed) return;
    const characters = new Set<number>([
      ...match.options.characters,
      ...match.teams.flat(),
      ...match.fighters.map((fighter) => fighter.character),
    ]);
    const names = new Set<string>();
    for (const character of characters) {
      for (const media of Object.values(
        this.assets.ultimateFinishes?.[character] ?? {},
      ))
        if (media.voice) names.add(media.voice);
      const identities = [
        { character },
        { character, stageForm: { ms: 1 } },
        { character, penguin: { ms: 1 } },
      ];
      for (const identity of identities)
        for (const [attack, move] of Object.entries(MOVES)) {
          if (
            move.ownerCharacter !== undefined &&
            move.ownerCharacter !== character
          )
            continue;
          const media = presentationFor(this.assets, identity, attack);
          if (media?.voice) names.add(media.voice);
          if (character === 2 && this.assets.penguinVoices[attack])
            names.add(attack);
          if (character === 1 && this.assets.soyoVoices[attack])
            names.add(attack);
        }
    }
    if (characters.has(1)) names.add("tensoraOhYeah");
    if (characters.has(7)) names.add("uikaImprisoned");
    await Promise.all(
      [...names]
        .filter((name) => this.urls[name])
        .map((name) => this.load(name).catch(() => undefined)),
    );
  }

  private getBuffer(name: string) {
    const buffer = this.buffers.get(name);
    if (!buffer) return undefined;
    // Map order is the LRU order. Active AudioBufferSourceNodes retain their
    // buffer safely even when a different match evicts the cache entry.
    this.buffers.delete(name);
    this.buffers.set(name, buffer);
    return buffer;
  }

  private store(name: string, buffer: AudioBuffer) {
    const previous = this.buffers.get(name);
    if (previous) this.bufferBytes -= this.bytes(previous);
    this.buffers.delete(name);
    this.buffers.set(name, buffer);
    this.bufferBytes += this.bytes(buffer);
    while (this.bufferBytes > MAX_AUDIO_BYTES && this.buffers.size > 1) {
      const oldest = this.buffers.keys().next().value as string;
      const evicted = this.buffers.get(oldest)!;
      this.bufferBytes -= this.bytes(evicted);
      this.buffers.delete(oldest);
    }
  }

  private bytes(buffer: AudioBuffer) {
    return (
      buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT
    );
  }

  private load(name: string): Promise<AudioBuffer> {
    const cached = this.getBuffer(name);
    if (cached) return Promise.resolve(cached);
    const existing = this.pending.get(name);
    if (existing) return existing;
    const promise = new Promise<AudioBuffer>((resolve, reject) => {
      this.queue.push({ name, resolve, reject });
    });
    this.pending.set(name, promise);
    this.pump();
    return promise;
  }

  private pump() {
    while (this.activeLoads < MAX_AUDIO_LOADS && this.queue.length) {
      const task = this.queue.shift()!;
      if (this.disposed || !this.context || !this.urls[task.name]) {
        this.pending.delete(task.name);
        task.reject(new Error("语音不可用"));
        continue;
      }
      this.activeLoads++;
      void this.decode(task.name)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.pending.delete(task.name);
          this.activeLoads--;
          this.pump();
        });
    }
  }

  private async decode(name: string) {
    const context = this.context;
    if (!context || this.disposed) throw new Error("语音不可用");
    const response = await fetch(this.urls[name], {
      signal: this.abort.signal,
    });
    if (!response.ok) throw new Error("语音加载失败");
    const bytes = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(bytes);
    if (this.disposed) throw new Error("语音加载已取消");
    this.store(name, buffer);
    return buffer;
  }

  pause(value: boolean) {
    this.paused = value;
    for (const channel of [
      this.voices,
      this.summons,
      this.music,
      this.speeches,
    ])
      channel?.setPaused(value);
  }
  stop() {
    this.finish = null;
    this.voices?.stop();
    this.summons?.stop();
    this.music?.stop();
    this.speeches?.stop();
  }
  private beginFinish(roundEnd: RoundEnd) {
    if (this.paused) return;
    const finisher = roundEnd.finisher;
    if (!finisher || this.finish?.tick === roundEnd.tick) return;
    const media = ultimateFinishFor(this.assets, finisher);
    const voice = media?.voice;
    const state: NonNullable<AudioDirector["finish"]> = {
      tick: roundEnd.tick,
      side: finisher.side,
      voice,
      duration: media?.durationMs ?? 2500,
      videoMs: null as number | null,
      complete: false,
      audible: false,
    };
    this.finish = state;
    // The defeated fighter's queued speech must not bleed into the winner's scene.
    this.voices?.stop();
    this.summons?.stop();
    this.music?.stop();
    this.speeches?.stop(1 - finisher.side);
    if (voice) {
      state.audible =
        this.speeches?.playAfterCurrent(voice, finisher.side, () => {
          if (this.finish !== state) return;
          state.videoMs = state.duration;
          state.complete = true;
        }) ?? false;
    }
  }
  /** The actual audio clock drives the muted background, including queued speech. */
  updateFinish(roundEnd: RoundEnd, dt: number, paused: boolean) {
    if (paused && this.finish?.tick !== roundEnd.tick)
      return { complete: false, videoMs: null };
    this.beginFinish(roundEnd);
    const state = this.finish!;
    if (!paused && !state.complete) {
      if (state.audible && state.voice)
        state.videoMs =
          this.speeches?.position(state.voice, state.side) ?? null;
      else {
        state.videoMs = Math.min(state.duration, (state.videoMs ?? 0) + dt);
        state.complete = state.videoMs >= state.duration;
      }
    }
    return { complete: state.complete, videoMs: state.videoMs };
  }
  consume(match: Match, events: CombatEvent[]) {
    for (const event of events) {
      const side = event.side ?? 0,
        fighter = match.fighters[side];
      if (event.type === "attack" && event.attack) {
        const media = presentationFor(this.assets, fighter, event.attack);
        const voice =
          media?.voice ??
          (this.assets.penguinVoices[event.attack] ||
          this.assets.soyoVoices[event.attack]
            ? event.attack
            : null);
        if (
          voice &&
          (MOVES[event.attack]?.sakiko === "ascension" ||
            MOVES[event.attack]?.arale === "dream" ||
            MOVES[event.attack]?.category === "super")
        ) {
          this.voices?.stop(side);
          // Combat recovery and automatic round transitions must not cut the sentence.
          if (!this.speeches?.playing(side)) this.speeches?.play(voice, side);
        } else if (voice && !this.speeches?.playing(side))
          this.voices?.play(voice, side);
      }
      if (event.type === "minionCall")
        this.summons?.play("tensoraOhYeah", side * 3 + (event.unit ?? 0));
      if (event.type === "stageFormStart" && fighter.character === 7)
        this.music?.play("uikaImprisoned", side);
      if (
        event.type === "stageFormStart" &&
        fighter.character === 6 &&
        !this.speeches?.playing(side)
      ) {
        const voice = presentationFor(
          this.assets,
          fighter,
          "mujicaTransform",
        )?.voice;
        if (voice) this.voices?.play(voice, side);
      }
      if (["stageFormEnd", "penguinEnd"].includes(event.type)) {
        this.music?.stop(side);
        this.voices?.stop(side);
      }
      if (event.type === "hit" && !event.blocked && !event.armored)
        this.voices?.stop(1 - side);
      if (["roundAdvance", "teamAdvance", "result"].includes(event.type)) {
        this.voices?.stop();
        this.summons?.stop();
        this.music?.stop();
      }
      if (event.type === "ultimateFinish" && event.finisher) {
        if (match.roundEnd) this.beginFinish(match.roundEnd);
        this.tone("ultimateFinish", 3);
      }
      if (["hit", "clash", "landing", "fight"].includes(event.type))
        this.tone(
          event.type === "hit" && event.blocked ? "block" : event.type,
          event.weight ?? 1,
        );
    }
  }
  private tone(kind: string, weight: number) {
    if (!this.enabled || this.paused || !this.context) return;
    const context = this.context,
      now = context.currentTime;
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    const frequency =
      kind === "ultimateFinish"
        ? 260
        : kind === "block"
          ? 850
          : kind === "fight"
            ? 392
            : 110 + weight * 30;
    const duration = kind === "ultimateFinish" ? 0.55 : 0.18;
    oscillator.type = kind === "block" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      38,
      now + duration * 0.75,
    );
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    for (const task of this.queue.splice(0))
      task.reject(new Error("语音加载已取消"));
    this.stop();
    for (const channel of [
      this.voices,
      this.summons,
      this.music,
      this.speeches,
    ])
      channel?.dispose();
    this.buffers.clear();
    this.bufferBytes = 0;
    void this.context?.close();
  }
}
