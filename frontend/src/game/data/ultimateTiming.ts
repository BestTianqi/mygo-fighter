import type { Move } from "../objects/Move";

/** Absolute cues in the existing, unsped audio. Evidence: docs/ultimate-cue-audit.md. */
export function applyUltimateTiming(moves: Record<string, Move>): void {
  const cues: Record<string, number> = {
    super: 620,
    soyoSuper: 1580,
    tomoriSuper: 7080,
    ranaSuper: 2900,
    rikiSuper: 280,
    penguinSuper: 50,
  };
  for (const form of ["normal", "stage"])
    for (const [character, cue] of [
      [5, 4630],
      [6, 4160],
      [7, 2330],
      [8, 6000],
      [9, 5320],
    ])
      cues[`mujica_${character}_${form}_super`] =
        character === 8 && form === "stage" ? 50 : cue;
  for (const [character, cue] of [
    [10, 620],
    [11, 900],
    [12, 0],
    [13, 2480],
    [14, 2940],
    [15, 540],
  ])
    cues[`mewtype_${character}_virtual_super`] = cue;
  for (const form of ["normal", "stage"]) {
    const m = moves[`mujica_6_${form}_super`];
    m.pulses = m.pulses!.map((p, i) => ({ ...p, at: 600 + i * 400 }));
    m.end = 1500;
  }
  const chant = moves.mewtype_12_virtual_super;
  const beats = [0, 860, 1640, 2560, 3480, 4560, 5520, 6480, 7740];
  chant.start = 0;
  chant.pulses = chant.pulses!.map((p, i) => ({ ...p, at: beats[i] }));
  chant.end = 7830;
  chant.duration = 8200;
  for (const [key, cue] of Object.entries(cues)) {
    const move = moves[key];
    const release = move.sakiko
      ? 0
      : (move.shots?.[0] ?? move.pulses?.[0]?.at ?? move.start);
    move.cinematic = {
      releaseCueMs: cue,
      leadInMs: Math.max(0, cue - release),
      mediaDelayMs: Math.max(0, release - cue),
    };
  }
}
