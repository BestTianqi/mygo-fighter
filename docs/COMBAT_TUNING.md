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
| 野乃花 · 海边搜寻·找到由乃亲         | 16 → 18                    |

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

## Nonoka — anime-only skill motifs, 2026-10-25

All active Nonoka skills, the regular throw and the super now select anime recordings rather than livestream memes. The existing full-body virtual outfit remains. The former “头像通缉” / “病娇国王” names and active presentations are replaced; original source media remains preserved.

| Command | Skill                 | Cost | Behavior                                                                                                                                   |
| ------- | --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| U       | 抱抱还是亲亲·强制手当 | 20   | Short approaching hug/command throw: advances 70, reaches 110, 14 damage and 600 ms stun. Beats grounded guard, can whiff; 2 s recast.     |
| I       | 海边搜寻·找到由乃亲   | 25   | Binocular search gesture into a continuous forward approach up to 300; retains 18 damage, 1.6 s recast.                                    |
| O       | 金枪鱼小黑·认真一拳   | 30   | A visible tuna prop accompanies the heavy punch: 24 damage, reach 240, launches and knocks down; 1.8 s recast.                             |
| ↓＋U    | 兔食者·咬咬波         | 20   | Forward cartoon jaws; retains the prior wave's 13 damage, speed 760 and maximum reach 900.                                                 |
| ↓＋I    | 我没事哦·元气护身     | 25   | Summons a frontal 24-HP heart shield for 1.8 s; 6 s recast. No healing or free resonance is granted.                                       |
| P       | 兔食者·不会放开由乃亲 | 100  | Retains the six-hit super, existing damage scaling, armor and shared 8-point defender resonance budget; adds bite effects and anime media. |

The “うさイーター” childhood identity is documented in the [official anime profile](https://anime.bang-dream.com/yumemita/character/nonoka/). The hug motif is visible in the [official episode 5 clip](https://www.bilibili.com/video/BV16bK46fENN/); the pursuit/holding motif and new super scene come from the [official episode 11 clip](https://www.bilibili.com/video/BV166tA6SExy/). The shield uses her line in the [official episode 9 clip](https://www.bilibili.com/video/BV1Mi8g6WEGV/). The tuna punch in episode 12 is independently described in [this episode review](https://note.com/crow_o/n/n33d5badb117e) and [this recap](https://blog.livedoor.jp/gosaber/archives/52292162.html). Combat effects are game adaptations of these scenes.

Three original anime recordings are cut at 1.50–4.90 s (hug), 7.00–11.00 s (holding Yuno) and 4.95–7.60 s (I'm fine), respectively. The 4-second super video and finish illustration are from the same holding-Yuno scene, with video playback rate 1. All active move aliases and timestamps are recorded in `assets/meme-media/nonoka-story/sources.json`; no new synthetic dialogue is used.

## Yuno — anime-only skill motifs, 2026-10-25

All active Yuno skills and her regular throw select official anime recordings. The original whole-body virtual costume, normal attacks and source/legacy media are preserved. The old livestream phrases are no longer selected by this kit.

| Command | Skill               | Cost | Behavior                                                                                                                                                                                                |
| ------- | ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 迈向世界·双重低音   | 20   | Two low bass discs at 120/300 ms, 8 base damage each; speed 620. Crouch guard or jump can avoid them.                                                                                                   |
| I       | 放开我·拒绝贴贴     | 25   | Retreats continuously up to 130 while striking around herself at 120 ms; 14 damage, reach 225, push 420, 450 ms stun, 1.8 s recast.                                                                     |
| O       | supremacy·海边重奏  | 30   | Marks the enemy's cast-time position within 420 ahead; radius 135, 500 ms warning after creation, 22 damage and 650 ms stun. Recovery ends before the strike; 3.2 s recast. The warning can be escaped. |
| ↓＋U    | 迈向世界·混音声波   | 20   | Retains the ranged wave's 14 damage, speed 560 and maximum reach 780; uses the new anime voice.                                                                                                         |
| ↓＋I    | 最棒的乐队·合奏屏障 | 25   | Retains the former frontal shield: 24 HP for 2 seconds, 6 s recast. Moved from I to the directional variant.                                                                                            |
| P       | 最高のバンド·世界へ | 100  | Retains the three surrounding hits, 8/12/28 base damage, existing combo scaling, super armor and the 8-point total defender resonance budget. Anime cutin runs at rate 1.                               |

DJ manipulation, former bass/composition work and world-stage ambition follow the [official anime character profile](https://anime.bang-dream.com/yumemita/character/yuno/) and the [official episode 10 flashback clip](https://www.bilibili.com/video/BV13HhG6vEJu/). The refusal of Nonoka's hug comes directly from the [official episode 11 clip](https://www.bilibili.com/video/BV166tA6SExy/). These combat effects adapt anime events rather than adding purported canonical powers or new spoken dialogue. The Akihabara penance marathon is Miyako's scene and is not assigned to Yuno.

Recordings are cut at 8.00–12.20 s (world ambition) and 0.00–5.75 s (best band) from episode 10, and 4.90–6.90 s (let go) from episode 11. The P video uses the same 0.00–5.75 s flashback at its original speed, padded to preserve the portrait framing; finish art uses Yuno's close-up at 26 s. Provenance is in `assets/meme-media/yuno-story/sources.json`. Five band colors, DJ discs, scratch arcs and a visible equalizer warning accompany retained whole-body sprites; no idle ghost layers are added.

Multi-hit U splits the defender's 8-point hit / 3-point guard resonance budget over both discs; attacker gain stays 2 per skill hit. Existing combo scaling produces 15 total damage for U and 41 for P against an idle target. Both-side combat, escape/cooldown cases, all anime presentation aliases, authored frames and server/client prediction are covered in `tests/yuno-story.mjs`.

## Ritsu — anime-only skill motifs, 2026-10-25

All active Ritsu skills, the counter derivative and her regular throw use official anime recordings. The intact full-body virtual costume and normals remain. Old livestream phrases remain archived but no longer appear in the active kit.

| Command | Skill               | Cost | Behavior                                                                                                                                                                                                      |
| ------- | ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 两磅肉排·双重横扫   | 20   | Steps forward up to 90; two sweeps at 140/330 ms, 7/11 base damage, reaches 220/260, second hit pushes away; 1.5 s recast. Existing combo scaling gives 17 total damage against an idle target.               |
| I       | 请多关照·优等生防反 | 25   | Frontal counter window at 100–420 ms, 4 s recast. Success emits an 18-damage guitar/steak wave. Throws, rear hits and attacks outside the window beat it.                                                     |
| O       | 七分熟·厚切重奏     | 30   | Retains the strengthened advancing heavy strike: 25 damage, advance 220, reach 175, first active at 210 ms. Uses a distinct heavy windup/impact and seared-steak motif.                                       |
| ↓＋U    | 七分熟·炙烤弦波     | 20   | Retains 16 damage, speed 700 and maximum reach 780; replaces voice and adds a steak silhouette to the blue guitar wave.                                                                                       |
| P       | 饥饿狂战士·开饭啦   | 100  | Five forward claw/guitar strikes at 100/280/460/640/820 ms, 10 base damage each, advance 180 and launch on the final hit. Existing scaling gives 40 total damage against an idle target; retains super armor. |

The good-student/food-obsessed rhythm guitarist is described in the [official anime character introduction](https://anime.bang-dream.com/bandorichan/character/yumemita/?member=ritsu) and [official character profile](https://bang-dream-on.bushimo.jp/character/yumemita/minetsuki-ritsu/). Food-ordering and polite greeting recordings are from the [official episode 7 clip](https://www.bilibili.com/video/BV1jpM96iEwC/): 19.75–21.05 s (two pounds), 3.85–6.55 s (please take care of me), 21.05–22.60 s (medium-well). The [official episode 11 hungry-berserker clip](https://www.bilibili.com/video/BV1UY4y6kEgz/) supplies her 9.65–12.95 s line about snacks and feeling weak. The super uses Ritsu's own voice, rather than Nonoka's later reaction. These combat effects and move subtitles are game adaptations, not new recorded dialogue or canonical powers.

The super video is the same 3.3-second hunger scene at playback rate 1, padded to retain the portrait framing. The finish illustration uses its 12-second frame. Original media and reviewed source references remain intact, with new provenance in `assets/meme-media/ritsu-story/sources.json`. Held steak props, paired sweep arcs, a frontal counter outline, cooking steam and alternating blue/gold claw strikes accompany retained full-body animation frames. All multi-hit skills share the existing 8-hit / 3-guard total defender resonance budget; the attacker still gains 2 per skill hit and zero for super hits. Both-side combat, counter boundaries/throws/cooldowns, distant whiffs, media/pose selection and authoritative server prediction are covered in `tests/ritsu-story.mjs`.
