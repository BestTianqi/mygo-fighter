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

## Received resonance — 2026-10-25

A complete damaging skill grants its target 8 resonance, or 3 when fully guarded. Multi-hit strikes and volleys split this amount across their authored hit count; a skill declaring both pulses and shots uses the larger count once. Partial hits grant only their corresponding share. For example, all five penguin/Mortis rings grant 8 total (1.6 each), and all nine Miyako seal hits also grant 8 total. Riki's internal bonus projectile shares the two-shot parent's budget.

The three Tensora summons share one cast budget: each contact grants up to 2, capped at 8 total for that summon (3 when fully guarded). Recasting creates a fresh budget. Absorbed or invulnerable hits grant nothing. Attacker gains remain 12 per normal hit, 2 per skill hit, 1 on guard, and zero for supers or summons.

Combat keeps fractional resonance precisely; the HUD truncates it to one decimal so a displayed spend threshold is actually available. Summon budget usage is included in LAN snapshots and prediction replay.
