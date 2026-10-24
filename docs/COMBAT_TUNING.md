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

| Character / skill                    | Base damage before → after |
| ------------------------------------ | -------------------------- |
| 爱音 · 闪光突刺                      | 14 → 16                    |
| 乐奈 · 野猫突进                      | 12 → 14                    |
| 立希 · 反拍砸击（含四拍强化）        | 18 → 21                    |
| 海铃（常服）· 零卡路里·收工重拍      | 22 → 25                    |
| 初华（变身）· 逐星突进（原双月滑奏） | 16 → 18                    |
| 律 · 弱弱胃袋·破蓝重奏               | 22 → 25                    |
| 野乃花 · 头像通缉·跃兔滑奏           | 16 → 18                    |

Mujica's stage damage multiplier applies once: Uika's transformed strike deals 21.6 damage before combo scaling or guard. Nyamu's former stage melee I was subsequently replaced by the two-projectile skill below. Restart an already-running LAN host after rebuilding so it loads the updated simulation.

## Received resonance — 2026-10-25

A complete damaging skill grants its target 8 resonance, or 3 when fully guarded. Multi-hit strikes and volleys split this amount across their authored hit count; a skill declaring both pulses and shots uses the larger count once. Partial hits grant only their corresponding share. For example, all five penguin/Mortis rings grant 8 total (1.6 each), and all nine Miyako seal hits also grant 8 total. Riki's internal bonus projectile shares the two-shot parent's budget.

The three Tensora summons share one cast budget: each contact grants up to 2, capped at 8 total for that summon (3 when fully guarded). Recasting creates a fresh budget. Absorbed or invulnerable hits grant nothing. Attacker gains remain 12 per normal hit, 2 per skill hit, 1 on guard, and zero for supers or summons.

Combat keeps fractional resonance precisely; the HUD truncates it to one decimal so a displayed spend threshold is actually available. Summon budget usage is included in LAN snapshots and prediction replay.

## Nyamu / Amoris stage skills — 2026-10-25

The normal form and P super retain their existing moves. H still costs 50 resonance for 20 seconds, with stage damage ×1.2 and movement ×1.1.

| Command | Stage skill                 | Cost | Behavior                                                                                                             |
| ------- | --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| U       | 素颜公开·摘下面具           | 20   | A surrounding flash, 240 reach, 14 base damage and 540 ms stun; 1.8 s recast                                         |
| I       | 双利手·交叉飞棒             | 25   | Two rotating drumsticks at 130/280 ms, 8 base damage each, 680 maximum reach; 1.2 s recast                           |
| O       | 我只有Ave Mujica了·绝境鼓点 | 30   | An advancing four-hit string at 160/300/440/580 ms; 4/4/6/10 base damage, final knockdown; 1.7 s recast              |
| ↓＋U    | 完美笑容·营业反击           | 20   | Counters frontal eligible strikes from 100–400 ms; success launches an 18-base-damage flash projectile; 4.2 s recast |

Stage damage and ordinary combo scaling apply once. Each full damaging skill still grants its target 8 resonance total (3 when fully guarded); sticks split it across two hits and the drum string across four. The attacker gains the existing 2 per skill hit.

Camera framing, mask fragments, wooden drumsticks and drum-hit arcs accompany the retained full-body artwork. No character costume is removed by U. The extra counter is listed only in stage form. Media aliases reuse Nyamu's existing verified original recordings, without changing super-video playback speed; skill names are not claims of new spoken dialogue.

The unmasking motif follows [official episode 2](https://anime.bang-dream.com/avemujica/story/), and the ambidextrous drummer / video creator motifs follow the [official character profile](https://anime.bang-dream.com/avemujica/character/nyamu/). The episode 10 line used for O's name is transcribed in [this episode review](https://note.com/isihida_nori/n/n87a3a663db6a). Existing original recordings retain their [source clip](https://www.bilibili.com/video/BV1XM62YsEgE/) and timestamps in the asset manifest.

## Umiri / Timoris stage skills — 2026-10-25

Umiri's stage form emphasizes low zoning, pulling opponents into range and a committed advancing throw. Normal-form skills and the P super remain intact; the existing 50-resonance / 20-second H transformation and stage multipliers are unchanged.

| Command | Stage skill       | Cost | Behavior                                                                                                                                      |
| ------- | ----------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 意欲何为·三连低鸣 | 20   | Three low ground waves at 120/260/400 ms; 6 base damage each, 700 maximum reach, 1.8 s recast. Crouch guard or a timed jump can avoid damage. |
| I       | 很遗憾·强制返场   | 25   | First strike at 180 ms reaches 350 and pulls up to 170; second at 420 ms reaches 240, lifts and knocks down. 7/13 base damage, 2.2 s recast.  |
| O       | 我吃不胖·零卡重摔 | 30   | Steps forward up to 120 before a short-range command throw at 180 ms. 26 base damage, 600 ms knockdown, 2.4 s recast; whiffs at long range.   |
| ↓＋U    | 排期已满·准点反拨 | 20   | Frontal counter window at 100–420 ms; success launches a 20-base-damage clock-shaped bass wave; 4.2 s recast.                                 |

All damage receives the existing stage ×1.2 multiplier and combo scaling. A full three-wave U or two-hit I grants the defender 8 resonance total (3 when fully guarded). Attacker gains stay at 2 per skill hit. Counter windows still lose to throws and attacks from behind.

Five vibrating strings, a retracting hook, lifting arcs, throw trails and a timetable/clock cue accompany retained whole-body drawings. I switches to a different authored pose for its second hit; O uses the existing throw windup/release. Stage-only voice aliases reuse the verified Umiri recordings and preserve original normal-form media and super-video playback speed.

The professional support bassist and scheduling motifs follow the [official character profile](https://bang-dream.com/artist/avemujica/yahata-umiri/). “意欲何为”, “很遗憾” and “我吃不胖” reuse the existing [original anime voice compilation](https://www.bilibili.com/video/BV1s65fzcEi2/) with reviewed timestamps in the asset manifest; “排期已满” is the move name, not a newly recorded line.

## Uika / Doloris stage skills — 2026-10-25

Uika's stage form combines pursuit, a retreating close-range burst, delayed zoning and a slow projectile. Normal-form skills, both original crawling P supers, the H transformation and its music retain their existing behavior. Stage damage remains ×1.2 and movement ×1.1.

| Command | Stage skill           | Cost | Behavior                                                                                                                                                                                           |
| ------- | --------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 不是不是不是·三重否认 | 20   | Retreats up to 90 while emitting three surrounding bursts at 120/250/380 ms. 4/4/8 base damage, expanding reach 190/225/260, final push 320; 1.8 s recast.                                         |
| I       | 想见Saki酱·逐星突进   | 25   | Advances up to 280, first active at 140 ms. Retains the buffed 18-base-damage single strike; 1.4 s recast.                                                                                         |
| O       | Imprisoned·囚爱星笼   | 30   | Telegraphs the enemy's cast-time position, clamped within 420 ahead. Radius 145, 550 ms warning after creation, 20 base damage and 700 ms stun; 3.2 s recast. Uika recovers before the area fires. |
| ↓＋U    | 同一片星空·弦月回响   | 20   | A slow, tall crescent travels at 300, up to 520 from its origin; 14 base damage, one hit, 2.2 s recast.                                                                                            |

The cage stays at its original warning position and can be escaped. Multi-hit U grants the target 8 resonance total (3 when fully guarded), split over three bursts; attacker gains stay at 2 per skill hit. Existing combo scaling applies normally.

The denial bursts alternate existing whole-body impact poses. Star trails, an expanding star cage and a musical crescent use code-drawn overlays without replacing the original art. Stage voice aliases map U to the original “不是不是不是” clip, I to “想见Saki酱”, O to “不是的”, and the extra crescent to “想见Saki酱”; normal-form and super media remain unchanged, including original playback speed.

The guitar/vocalist, stargazing and childhood connection motifs follow the [official character profile](https://anime.bang-dream.com/avemujica/character/uika/). Pursuit/denial motifs reuse the existing [verified source clip](https://www.bilibili.com/video/BV1oLVXzFEUW/) with reviewed timestamps in the asset manifest. Star-cage and crescent names describe game-designed effects rather than new recorded dialogue.
