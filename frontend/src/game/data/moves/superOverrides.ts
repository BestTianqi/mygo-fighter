import type { Move } from "../../objects/Move";

/** Authored combat timings deliberately differ from recorded video durations. */
export function applySuperOverrides(MOVES: Record<string, Move>): void {
  for (const form of ["normal", "stage"]) {
    const move = MOVES[`mujica_6_${form}_super`];
    Object.assign(move, {
      sakiko: "ascension",
      targetArea: true,
      targetLock: true,
      areaRadius: 330,
      reach: 330,
      vertical: 330,
      duration: 1750,
      start: 0,
      end: 1350,
      hitstop: 30,
      // Control releases on the cast tick; the rain retains the original damage.
      fixedDamage: true,
      pulses: move.pulses!.map((pulse, i) => ({ ...pulse, at: 250 + i * 500 })),
    });
  }
  Object.assign(MOVES.penguinSuper, {
    name: "春日影·企鹅演唱",
    duration: 1500,
    start: 50,
    end: 930,
    hitstop: 0,
    shots: [50, 230, 410, 590, 770],
    pulses: [50, 230, 410, 590, 770].map((at) => ({ at, damage: 10 })),
    speed: 650,
    lifetime: 1100,
  });
  const penguinSong = MOVES.penguinSuper;
  Object.assign(MOVES.mujica_8_stage_super, {
    name: "Mortis·失控尖叫",
    mortis: "scream",
    projectile: true,
    radial: true,
    fixedDamage: true,
    omni: true,
    duration: penguinSong.duration,
    start: penguinSong.start,
    end: penguinSong.end,
    hitstop: penguinSong.hitstop,
    damage: penguinSong.damage,
    shots: [...penguinSong.shots!],
    pulses: penguinSong.pulses!.map((pulse) => ({ ...pulse })),
    reach: penguinSong.reach,
    speed: penguinSong.speed,
    lifetime: penguinSong.lifetime,
    height: penguinSong.height,
    stun: penguinSong.stun,
    push: penguinSong.push,
  });
  for (const form of ["normal", "stage"])
    Object.assign(MOVES["mujica_7_" + form + "_super"], {
      duration: 1000,
      start: 80,
      end: 930,
      crawlSpeed: 600,
      forwardCrawl: true,
      damage: 10,
      fixedDamage: true,
      hitstop: 0,
      pulses: [100, 280, 460, 640, 820].map((at, i) => ({
        at,
        damage: 10,
        reach: 200,
        stun: 240,
        push: i === 4 ? 180 : 0,
      })),
    });
}
