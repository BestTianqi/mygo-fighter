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
