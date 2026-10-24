# Combat timing retained by the rewrite

The typed kernel preserves the prior game’s movement and battle rules. The current sources are `frontend/src/game/combatData.ts` and `frontend/src/game/engine.ts`.

| Mechanic                 | Current baseline                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Simulation step          | 10 ms                                                                              |
| Anon walk / air speed    | About 475 / 360 world units per second                                             |
| Jump / double jump       | Initial vertical speeds about 1197 / 1001                                          |
| Gravity                  | About 3307 world units per second squared                                          |
| Blink                    | About 242 world units; 600 ms cooldown; 120 ms starting invulnerability; 10 energy |
| Input buffers            | 150 ms normal attacks; 300 ms other actions                                        |
| Light chain              | Three stages, with the third launching the target                                  |
| Standard health / energy | 200 / 100                                                                          |
| Formal round             | 60 seconds; first to two round wins                                                |
| Transformations          | 50 energy; 20 seconds; no refresh during the form                                  |

Different characters retain their own speed ratios, move timings, costs, directional variants, cancellation windows and forms. Local 3v3 retains the surviving fighter’s resources and advances the defeated team’s order.

Rebuild with `npm run build` after changing combat data or timing so local play and the JVM server use the same updated rules. The server timing and transport behavior are documented in [LAN.md](LAN.md).

## Selected melee damage — 2026-10-25

Short-range approaches and slower committed strikes gain 2–3 base damage (about 12–17%). These are single-hit skill adjustments; normal attacks, projectiles, supers, control effects, timing, range and costs retain their existing values. Skill hits still restore 2 resonance.

| Character / skill               | Base damage before → after |
| ------------------------------- | -------------------------- |
| 爱音 · 闪光突刺                 | 14 → 16                    |
| 乐奈 · 野猫突进                 | 12 → 14                    |
| 立希 · 反拍砸击（含四拍强化）   | 18 → 21                    |
| 海铃（常服）· 零卡路里·收工重拍 | 22 → 25                    |
| 初华（变身）· 双月滑奏          | 16 → 18                    |
| 若麦（变身）· 踏碎节拍          | 16 → 18                    |
| 律 · 弱弱胃袋·破蓝重奏          | 22 → 25                    |
| 野乃花 · 头像通缉·跃兔滑奏      | 16 → 18                    |

Mujica's stage damage multiplier applies once: the two transformed skills now deal 21.6 damage before combo scaling or guard. Restart an already-running LAN host after rebuilding so it loads the updated simulation.
