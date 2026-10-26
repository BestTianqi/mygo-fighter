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

Multi-hit U splits the defender's 8-point hit / 3-point guard resonance budget over both discs; attacker gain stays 2 per skill hit. Existing combo scaling produces 15 total damage for U and 41 for P against an idle target.

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

The super video is the same 3.3-second hunger scene at playback rate 1, padded to retain the portrait framing. The finish illustration uses its 12-second frame. Original media and reviewed source references remain intact, with new provenance in `assets/meme-media/ritsu-story/sources.json`. Held steak props, paired sweep arcs, a frontal counter outline, cooking steam and alternating blue/gold claw strikes accompany retained full-body animation frames. All multi-hit skills share the existing 8-hit / 3-guard total defender resonance budget; the attacker still gains 2 per skill hit and zero for super hits.

## Miyako — anime small skills, 2026-10-25

Only Miyako's small skills and regular throw are reassigned. The existing P super retains its nine locked hits totaling 50 damage, 80% casting damage reduction, all original timing, audio/video and finish illustration. The full-body virtual artwork and normal attacks remain intact.

| Command | Skill                 | Cost | Behavior                                                                                                                                                                                                                           |
| ------- | --------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 富士见夜子·双页分镜   | 20   | Two arcing manuscript pages at 150/330 ms; 8 base damage each, speed 560, initial height 135, upward velocity 200 and gravity 560, maximum reach 760. Existing combo scaling gives 15 damage on a complete hit.                    |
| I       | 百次参拜·赎罪印       | 25   | Marks the opponent's cast-time position, clamped within 420 ahead. Radius 135, 650 ms warning after creation, 24 damage and 650 ms stun; 4 s recast. Miyako can move after her 450 ms recovery; the target can escape the warning. |
| O       | 秋叶原马拉松·赶稿突进 | 30   | Runs forward continuously up to 320 over 300 ms; active at 190 ms, reach 165, 22 damage and 400 ms stun; 1.8 s recast. No teleportation or invulnerability.                                                                        |
| ↓＋U    | 不会停笔·墨线声波     | 20   | Retains the ranged wave's 15 damage, speed 640 and maximum reach 820; pen-nib/ink silhouette and new original anime recording.                                                                                                     |

The weekly manga artist identity “富士見夜子” is documented in the [official anime character profile](https://anime.bang-dream.com/yumemita/character/miyako/). The [official episode 11 clip](https://www.bilibili.com/video/BV1SEtG6dECK/) supplies all four original-speed recordings: 5.00–8.45 s (doing what must be done), 16.80–18.90 s (one hundred shrine visits), 14.10–16.75 s (Akihabara marathon), and 0.00–3.45 s (living her own way). Source metadata and timestamps are in `assets/meme-media/miyako-story/sources.json`. Manuscript attacks, a penance stamp and the deadline-sprint subtitle are game adaptations of her manga career and that scene, not new recorded dialogue or claims of canonical powers.

Paper throws switch full-body impact poses on the second release. The stamp uses a crouching pose and an explicit ground warning spanning the actual damage radius; the run uses an existing dash pose, speed lines and footprints. No duplicate body layers are added. Small skills use no video cutins. Multi-hit U shares one 8-point hit / 3-point guard total defender resonance budget, while attacker gain remains 2 per skill hit.

## Sakiko — circular binding and descending chords, 2026-10-25

Both normal and stage P (我来成为神明) spend 100 resonance and acquire once on the release tick, within a true 330-unit circle centered at the caster's original body center. Facing does not restrict acquisition. Invulnerable opponents and late entrants are not captured. A captured opponent stays at their original position, including in the air or on a platform, until the 1.75-second cast ends or either fighter is defeated. The existing target binding is serialized for LAN prediction.

Sakiko rises smoothly by up to 160 units over 320 ms, hovers, and returns during the final 340 ms. World height limits still apply. Three descending chords strike the locked position at 250/750/1250 ms for 8/12/28 fixed base damage: 48 total, or 57.6 under the existing stage multiplier. Super armor and the shared 8-point defender resonance budget remain; super hits restore no attacker resonance. A missed field deals no later tracking damage.

Five replacement recordings use Sakiko's actual anime voice, checked against visible speakers and word-level Japanese transcription in [the source compilation](https://www.bilibili.com/video/BV13KXeYpEcL/). P now includes the full “神様などいない。ですから、私が神になります。” at 34.45–40.45 s, stopping before the other speaker's reaction. The former U cut included that reaction and is replaced, along with I/O/H; throw uses the new O clip. The verified customer-service recording remains. Exact timestamps and speaker evidence are in `assets/meme-media/sakiko-requiem/sources.json`.

The six-second speech and video keep original speed, independently of the shorter combat animation. An independent recorded-speech channel lets the sentence finish through ordinary follow-up attacks, form expiry and automatic round transitions; same-speaker clips do not overlap it. Pause resumes from its saved offset. Explicit mute, restart or leaving still stops all audio. Original source media remains archived; only the superseded, unreferenced runtime video is removed.

## Arale — anime voice and magical microphone, 2026-10-25

U/I/O have distinct pressure, protection and approach roles. Her original whole-body virtual artwork and normals remain. The magical-girl fandom and powerful vocalist motifs follow [her official anime profile](https://anime.bang-dream.com/yumemita/character/arale/); the effects below are gameplay adaptations of those motifs and her dialogue.

| Command | Skill                 | Cost | Behavior                                                                                                                                                                                                          |
| ------- | --------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 梦想就是力量·星光声弹 | 20   | One arcing star: 16 damage, first release at 140 ms, speed 520, initial height 135, upward velocity 240/gravity 640, maximum reach 650; 1.2 s recast. The curved trajectory differs from the flat ranged variant. |
| I       | 往事翻篇·现在加油     | 25   | Front-facing, breakable 24-HP star barrier for 2 s; appears at 120 ms, 6 s recast. It absorbs frontal damage, without healing or protection from rear attacks.                                                    |
| O       | 行动起来·破局突进     | 30   | Advances continuously up to 240 over 280 ms; active at 180–300 ms, reach 180, 24 damage and push 260; 1.8 s recast. Can miss or be guarded; no teleport or invulnerability.                                       |
| ↓＋U    | 用歌声对话·直线音波   | 20   | Retains the flat wave's 14 damage, speed 600 and maximum reach 850, with a new recorded line and star/note effect.                                                                                                |
| P       | 梦限大·无数次做梦     | 100  | Three tall forward vocal waves released at 120/420/720 ms, 8/12/28 base damage, maximum reach 900, recovery at 1.2 s. Existing scaling yields 41 damage against an idle target; super armor stays.                |

The new active U/I/O/down-U/P/throw aliases all use Arale's own anime voice. Episode 1's [“the past is over; do your best now”](https://www.bilibili.com/video/BV1kuTf6dEQ2/) supplies I at 0.30–3.65 s. Episode 11's [wish/action discussion](https://www.bilibili.com/video/BV1Ua4y6VErp/) supplies O at 3.35–7.85 s. Episode 12's [decision to speak through singing](https://www.bilibili.com/video/BV1cWYx6bEM4/) supplies U at 19.50–21.25 s and the flat wave at 7.10–9.35 s. P is her complete [episode 13 band-name declaration](https://www.bilibili.com/video/BV1vueJ6qE1L/) at 38.95–43.95 s. Its five-second video keeps original speed; finish art uses the same scene's 41.90 s close-up. Exact speaker evidence is in `assets/meme-media/arale-story/sources.json`.

P reuses the independent speech channel, so normal recovery, follow-up skills and automatic round transitions do not cut her complete declaration; pause resumes its offset and explicit mute/restart/leave stops it. Arale's small skill voices follow normal interruption rules. Star trails, a golden shield, approach streaks and five band colors accompany existing poses. No idle ghost layers or duplicate bodies are added. All skill hits keep the shared 8-point total defender resonance budget and 2-point attacker gain; super hits grant no attacker resonance.

## Mortis — earlier super video window, 2026-10-25

The user requested moving the stage P video start two seconds earlier, clamped to the beginning of [the previously selected source](https://www.bilibili.com/video/BV1uPf5YCE73/). Its previous start was 0.95 s, so the new video window is 0.00–2.10 s. The existing scream audio retains its 0.95–3.05 s window; this deliberate video offset does not change either playback speed. The red stage wide shot replaces the unrelated “protect Mutsumi and her band” dialogue video. The independent speech channel lets the scream finish through follow-up attacks and resumes its saved offset after pause. The old source video remains archived. Finish art, damage and stage P's five-ring combat timing remain unchanged.

## Faster Mutsumi, tracking Umiri and height tolerance, 2026-10-25

Normal Mutsumi P releases three strikes at 60/340/620 ms and recovers after 1000 ms of combat time, plus hitstop. Fixed damage preserves the previous 48-point total despite the shorter gaps. Her original 8.1-second recording and video continue at playback rate 1, independently of recovery. Both forms of Mutsumi and Umiri use the independent speech channel, so a quick follow-up skill cannot cut the original super recording short; mute, explicit restart and leaving still stop playback.

Both forms of Umiri P release one homing bass wave at 100 ms, recover after 650 ms, and deal one fixed 30-point base hit (36 with the existing stage multiplier). The wave travels at 760 units/s and turns toward the opponent's current body center on both axes, at up to 8 radians/s. Its lifetime is 4500 ms and total travel limit is the world's 2400-unit width. It can be guarded, blocked by a shield or destroyed by projectile collision, and expires normally or at round end. Homing and vertical velocity are serialized in the existing shared match state for prediction. Super hits restore no attacker resonance and retain the total 8-point defender hit / 3-point guard budget.

Heavy attacks now multiply authored horizontal reach by 1.5 instead of 1.2, increasing their previous effective range by 25%; heavy swing trails follow the wider reach. Minimum vertical tolerances are 240 for normal attacks, 320 for true heavy attacks, 280 for close-range skills and 360 for close-range supers. Compact-form Tomori uses the same expanded heavy reach. Throws, targeted ground areas and target-lock acquisition retain their authored geometry.

Non-ground forward projectiles allow at least 260 units between the wave center and the target body center; non-homing super waves also allow up to 360 units of caster/target foot-height difference. Ground shockwaves and radial rings retain their existing geometry. These changes make nearby platform fights more forgiving while a 600-unit melee height gap still misses. Damage, ordinary skill costs and existing combo recovery are unchanged outside the requested Umiri super redesign. LAN hosts must restart the backend and both players refresh after updating the shared combat code.

## Remove ineffective skill entries, 2026-10-25

An audit of all character/form bindings found five ineffective entries: Mujica's H transformation remained listed after transforming, although a second transformation is unavailable during the 20-second form. Stage schemes and move lists now omit that entry and restore it after expiry. Touch controls and the battle hint follow the locally controlled fighter, including the guest's side and reserve changes in LAN play; characters without a transformation show no H button. Removing a held touch button releases its input. Help labels clarify which characters can transform.

The remaining 149 skill entries were exercised through their actual direction/button inputs. Each produced damage, movement, control, healing, energy, beats, shielding, summons or transformation; counters were tested against an incoming frontal hit. Functional zero-damage support skills, source media and attack modules remain intact.

## Viola — camera and editing pressure, 2026-10-25

Viola (ビオラ) joins as character 15, with 200 HP and the standard J/K/L/U/I/O/P controls. She belongs to Fairy Bouquet; the shared MewType code and atlas family retain the existing architecture without labeling her a member of the main five. Her normal, crouching and airborne attacks include three distinct J poses and a separate heavy strike. She has one costume and no H transformation entry.

| Command | Skill             | Cost | Behavior                                                                                                                                                                                                                              |
| ------- | ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 镜头闪拍          | 20   | Close flash in either facing direction, horizontal reach 220, 16 damage, first active at 160 ms; 1.4 s recast.                                                                                                                        |
| I       | 断章取义·剪辑陷阱 | 25   | Marks the opponent's cast-time position, clamped within 420 ahead; 135-radius ground warning lasts 700 ms after creation, then deals 24 damage. Viola recovers before detonation; moving out of the warning avoids it. 4 s recast.    |
| O       | 原样就好·退场推击 | 30   | Advances continuously up to 160, then strikes at 200–300 ms for 24 damage with strong push and knockdown; 2 s recast.                                                                                                                 |
| ↓＋U    | 做得真好·剪辑声波 | 20   | One film-strip wave, 14 damage, speed 680, maximum travel 820; first release at 170 ms.                                                                                                                                               |
| P       | 引爆点·剪辑放送   | 100  | Three strikes at 100/420/740 ms deal fixed 8/12/28 damage (48 total), within a 240-radius horizontal field at the cast-time target position. Recovery at 1.1 s plus hitstop; the opponent is not bound. Retains standard super armor. |

The five original recordings are Viola's own voice from [the official character CM](https://www.bilibili.com/video/BV11uK36xEs2/). P retains the complete sentence subtitled “这个数字，感觉会成为不错的引爆点呢” at 16.85–20.90 s, with the same 4.05-second video at playback rate 1 and a matching finish still. Its independent speech channel finishes through fast recovery and follow-up attacks. Other recordings cover her greeting, message not reaching its recipient, telling Arale to remain as she is, and praise. Source timestamps, uploader, speaker evidence and hashes are in `assets/meme-media/viola-story/sources.json`; no commentary voices are used. Camera flashes, film strips and warning frames are gameplay adaptations of her portrayal, not claims of canonical powers.

Skills retain the common 2-point attacker gain and 8-point total defender hit / 3-point guard resonance budget. P grants no attacker resonance. Solo, CPU, practice and ordered 3v3 use the same shared rules; LAN protocol 5 prevents older clients without the new character from joining incompatible games.

## Taki — rhythm pressure and original anime dialogue, 2026-10-26

The existing whole-body artwork, J/K attacks and four-beat meter remain. U/I/O now cover quick pressure, mid-range ground control and sustained close pressure. Names, recorded dialogue and alternating whole-body poses follow the same action; original “ha?” source files remain archived.

| Command | Skill                 | Cost | Behavior                                                                                                                                                                                                                                                                                    |
| ------- | --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U       | 什么都不懂·反拍连打   | 20   | Three strikes at 80/220/360 ms, 6 base damage each (16 after existing combo scaling), 600 ms recovery; switches between three actual impact drawings.                                                                                                                                       |
| I       | 拉黑你·低音驱离       | 25   | One low ground wave, 18 damage, first release at 180 ms, speed 640, travel capped at 800. Grounded opponents can block it low; jumping avoids it. Four-beat enhancement adds a second 8-base-damage wave at 360 ms (25 total on full hit).                                                  |
| O       | 灯才不会·八拍护航     | 30   | Eight strikes at 160–790 ms in 90 ms steps, 36 total base damage (24 after scaling), 1.05 s recovery; small forward step retained. Four-beat enhancement consumes four beats and increases the finisher from 8 to 18 base damage, reach 260 and knockdown 700 ms (29 damage on a full hit). |
| 前＋U   | 谁？何用？·抢拍突进   | 15   | Retains advancing approach, now 16 damage; enhanced version retains faster pursuit.                                                                                                                                                                                                         |
| ↓＋U    | 反拍砸击              | 20   | High strike now deals 24 base damage; distinct overhead pose.                                                                                                                                                                                                                               |
| 前＋I   | 重拍上挑              | 25   | Anti-air strike now deals 20 base damage; four-beat enhancement retains its higher reach and pursuit.                                                                                                                                                                                       |
| ↓＋I    | 一己私欲·节拍校准     | 15   | Adds two beats at 150 ms, recovers after 450 ms, six-second cooldown; cannot be used at four beats.                                                                                                                                                                                         |
| P       | 曲子由我来写·四拍终奏 | 100  | Four strikes at 80/300/520/740 ms, fixed 8/10/12/18 damage (48 total). Forward reach expands 300/340/380/420, recovery at 1.2 s plus hitstop, standard super armor retained. Each beat selects a different existing drawing.                                                                |

Normal hits still supply beats; four beats enhance the next supported special, including the new `rikiEightBoost`. The enhancement inherits the ordinary eight-beat advance, so a target 250 units away receives all eight hits rather than only the final strike. Enhanced attack names, voices and snapshots are supported by LAN protocol 6. CPU choices follow the revised costs and ground-wave range. Defender resonance remains a single 8-hit / 3-guard total budget per skill, including both enhanced waves; attacker gain stays 2 per skill hit and zero for P.

Six replacement recordings come from the original [Taki character CM](https://www.youtube.com/watch?v=UH6zMjECvQo), with Hayashi Coco's Taki dialogue verified against mouth movement and Japanese transcription. Download provenance points to [the unaltered CM reupload, page 5](https://www.bilibili.com/video/BV1i14y1U7DP/?p=5), CID 1173143579; its uploader is explicitly identified as non-official. The colleague's and Anon's dialogue are excluded. U/I/O use her critique, blocking remark and defense of Tomori; the advance uses her question and calibration her statement about her own ego. The overhead reuses U, the anti-air reuses O, and each enhanced move reuses its own base recording.

P preserves the entire “わかった。曲は私が書く。” at 19.55–22.38 s: 2.83 seconds of original-speed audio and the same video interval, plus a finish still at 20.60 s. The independent speech channel finishes through fast recovery, follow-up skills and automatic round advance; explicit mute, restart and leaving stop it. Purple beat arcs, a blocking-mark wave, four/eight-beat indicators and gold enhancement strokes accompany intact character drawings. Timestamp, publisher/reuploader distinction, speaker evidence and hashes are in `assets/meme-media/taki-story/sources.json`.

## Rana — cat steps, parfait and anime dialogue, 2026-10-26

Rana keeps her original normal-proportion character artwork, normal attacks, 200 HP and unified controls. U now links two advancing guitar strikes (15 resonance, 8/10 base damage; 17 after scaling) at 100/230 ms, with two impact poses and cat footprints. I throws the original matcha parfait at 150 ms for 20 damage, speed 720 and a flatter arc, capped at 900 travel. O costs 35 rather than 60, releasing four 9-base-damage notes at 80/230/380/530 ms; a complete hit against an idle opponent deals 30 after scaling. Its existing guitar poses alternate with each note.

Down-U uppercut deals 20, forward-U slide 16, and aerial down-O dive 18. Forward-I is a larger 22-damage chord; down-O is a cheaper 15-resonance, 14-damage single note. Down-I still grants 20 resonance with an eight-second cooldown, now triggering at 500 ms and recovering at 700 ms; interruption before the trigger grants nothing. CPU choices reflect the revised costs and ranges.

P, `结束了吗？·野猫终奏`, releases three expanding forward sweeps at 80/360/640 ms, dealing fixed 10/14/24 damage (48 total) over reach 320/400/480. Recovery is 1100 ms plus hitstop; super armor remains. Each sweep selects a different existing guitar pose. All skills retain the shared defender resonance budget of 8 on hits or 3 on guards, split among their hits; attacker gain remains 2 per skill hit and zero for P. Protocol 7 keeps both clients and the host on these same timings and projectile paths.

Seven actual Rana recordings replace her previous runtime slots and cover all eleven skill/throw aliases. The source is the official [Rana character CM](https://www.youtube.com/watch?v=YE6sJdXyrKo), voiced by Hina Aoki; the downloaded [unaltered reupload, page 3](https://www.bilibili.com/video/BV1i14y1U7DP/?p=3) is recorded separately from the official publisher. P plays the complete “バンド、終わり？バイバイ。” at 23.15–26.60 s, with the same 3.45-second original-speed video and a finish still at 26.00 s. Its protected speech continues after recovery and follow-up attacks; explicit mute/restart/leave stops it. Source timings, speaker evidence and hashes are in `assets/meme-media/rana-story/sources.json`. Other characters' media and all original character artwork are preserved.

## Individual entrances — 2026-10-26

Every character has an entrance sequence using existing full-body poses, a short approach and restrained character-specific accents. Anon greets with pink sparkles; Soyo makes a composed entrance with petals; Tomori takes a breath; Rana hops in and tests her strings; Taki readies her sticks. Umiri tests a bass note, Sakiko prepares her keys, Uika greets softly, Mutsumi quietly tunes, and Nyamu frames her camera. Arale greets with stars, Ritsu bows, Miyako traces an ink stroke, Yuno warms up her bass, Nonoka skips in with hearts, and Viola frames a film shot. Each showcase resolves at least two different source drawings; no replacement portrait, transformed costume, duplicate body or combat attack is introduced.

The 2100 ms entrance ends before the 650 ms READY cue. These animations project from `phaseMs` and `entrySides` and never move actual hitboxes or spend resonance. The fight timer stays at 60 seconds until input is accepted. Pause/reconnect retain progress, mirrored opponents face inward, and only a new 3v3 reserve performs after a knockout. Reduced-motion mode holds a static pose and label instead of the approach, hop, rotation or particles. Protocol 9 carries the timing and entrant flags in authoritative snapshots.

## Three-hit J chains restored — 2026-10-26

Mujica and MewType already had distinct second/third normal moves and artwork, but the shared scheme command resolver always selected the first strike. Standing repeated J now resolves the current form's opener → Jab2 → Jab3. The existing cancel windows link the stages; the third strike must recover before a fresh opener. The same resolver handles mobile touch repeat. MyGO/Penguin's original mapping and all existing damage, resource gain, reach, heavy attacks, crouching/air normals and skill cancels are retained. Protocol 10 keeps authoritative command resolution and local prediction aligned.

## Arcade entrance presentation — 2026-10-26

Entrances now use a 500 ms approach, a short planted landing with foot-anchored compression and dust, three character-specific showcase poses, and a settled guard stance. The second fighter answers 100 ms later; a lone 3v3 reserve enters immediately. Walking follows the projected terrain height, while hop entrances add their arc above that surface. Only the render projection moves: positions, hitboxes, HP, resonance and input lock retain their existing rules.

Original face artwork appears in angled name strips. A wider approach shot settles back to the gameplay camera before READY; ROUND, VS, READY and a brief FIGHT cue provide the arcade rhythm. The existing 2100 + 650 ms ready clock is unchanged. Pausing and network restoration retain progress, a survivor skips the entrance, and reduced-motion presentation holds a static pose with no slide, hop, compression or camera move. Protocol 10 remains compatible because these changes do not alter simulation state or timing.

The name strips are now full portrait cut-ins: original transparent standing art slides in from each player's side, cropped to the head and torso inside diagonal panels. A brief hold and outward exit reveal the stage again before the final guard pose. Art keeps its original proportions, colors and orientation. All selected fighters and 3v3 reserves preload their full portraits through the existing loading barrier. Only entrants receive a panel; reduced-motion mode shows a static portrait without sliding, fading or zooming. The existing ready duration and protocol remain unchanged.
