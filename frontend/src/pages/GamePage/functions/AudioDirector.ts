import { createVoicePlayer } from "./createVoicePlayer";
import type { Assets } from "../../../game/objects/Assets";
import type { CombatEvent } from "../../../game/objects/CombatEvent";
import type { Match } from "../../../game/engine";
import { presentationFor } from "./presentationFor";
import { MOVES } from "../../../game/combatData";

/** Recorded channels are independent. Pausing retains offsets; mute and reset release them. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private voices: ReturnType<typeof createVoicePlayer> | null = null;
  private summons: ReturnType<typeof createVoicePlayer> | null = null;
  private music: ReturnType<typeof createVoicePlayer> | null = null;
  private speeches: ReturnType<typeof createVoicePlayer> | null = null;
  private loading: Promise<void> | null = null;
  private enabled = true;
  private paused = false;
  constructor(private readonly assets: Assets) {}
  async unlock(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.voices?.setEnabled(false);
      this.summons?.setEnabled(false);
      this.music?.setEnabled(false);
      this.speeches?.setEnabled(false);
      return;
    }
    this.context ??= new AudioContext();
    await this.context.resume();
    const context = this.context;
    this.loading ??= Promise.all(
      Object.entries({
        ...this.assets.penguinVoices,
        ...this.assets.soyoVoices,
        ...this.assets.memeVoices,
        ...this.assets.summonVoices,
        ...this.assets.transformMusic,
      }).map(async ([name, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("语音加载失败");
        return [
          name,
          await context.decodeAudioData(await response.arrayBuffer()),
        ] as const;
      }),
    )
      .then((entries) => {
        const buffers = Object.fromEntries(entries);
        this.voices = createVoicePlayer(context, buffers);
        this.summons = createVoicePlayer(context, buffers);
        this.music = createVoicePlayer(context, buffers);
        this.speeches = createVoicePlayer(context, buffers);
      })
      .catch((error) => {
        this.loading = null;
        console.warn(error);
      });
    await this.loading;
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
    this.voices?.stop();
    this.summons?.stop();
    this.music?.stop();
    this.speeches?.stop();
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
            (MOVES[event.attack]?.category === "super" &&
              [3, 4, 5, 8, 15].includes(MOVES[event.attack].ownerCharacter!)))
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
      kind === "block" ? 850 : kind === "fight" ? 392 : 110 + weight * 30;
    oscillator.type = kind === "block" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(38, now + 0.13);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    this.stop();
    void this.context?.close();
  }
}
