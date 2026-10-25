# 长崎素世动作扩展与归心·自愈

2026-10-18。使用内置 imagegen 生成，透明 RGBA，六组共24张。参考 `soyo-idle.png` 的正常身材、服装和色调，以及 `faces-v3-guide.png` 下排素世的2D脸。原待机图保留。

游戏动作以从容步伐、开放掌拦截、单掌试探、双掌推拍、招手施法为主，区别于爱音的拳脚与突进。四段回血动作是按胸起手、闭眼凝神、舒展释放、缓缓收招；淡绿色环与恢复数字由游戏绘制。

G（2P Delete）消耗35共鸣，地面施法0.7秒后回复24生命，上限100，总施法1.2秒，施放起独立冷却12秒。满血、空中或冷却时不消耗。释放前受击会中断治疗，已花费能量和冷却保留；暂停冻结。CPU在低血量、有距离且对手未出招时考虑回血。支持触屏。

运行图集 `soyo-extra-runtime.webp`，帧名与高度在 `soyo-extra-actions.json`。所有素材内嵌 `../index.html`，离线浏览器可玩。

## 完整公共提示词

Use case: illustration-story. Asset: 2D fighting game animation sprite sheet for Nagasaki Soyo from BanG Dream It's MyGO. Create EXACTLY FOUR isolated full body sprites, arranged invisible 2x2 cells, reading top-left, top-right, bottom-left, bottom-right. Transparent RGBA background. No labels, borders, floor shadows, props, text or magical effects. All characters face RIGHT in three-quarter side view, head-to-shoes entirely inside each cell with 45px clear margins. Same head size and scale in all four cells. Normal anime teenage proportions, about 6.5 heads tall, NOT chibi. Reference image 1 is exact approved character identity, palette and sailor uniform; reference image 2 BOTTOM ROW ONLY is Soyo's face likeness. Do not use the pink-haired character in the guide. Preserve long light ash-brown hair, asymmetrical side swept forelock, gentle slightly downturned blue-gray eyes, delicate small nose and mouth, soft reserved expression. Exact muted navy/slate long-sleeve sailor blouse, white collar and cuff stripes, gray-lilac bow, navy pleated skirt with two white hem stripes, navy knee socks and brown loafers. No warmer orange hair or brighter blue uniform. Clean official-style 2D anime cel shading, fine facial and eyelash lines. Unique action language: composed, upright, measured footwork and OPEN HAND palm techniques, gently restrained expression. Never generic aggressive boxing or Anon's big kicks. Keep skirt modest in all poses.

## 每组追加提示词

### mobility

保存：`soyo-extra-mobility-v1.png`

帧序：walk-contact, walk-pass, dash-forward, dash-back

FOUR POSES: 1 measured forward step heel contact, open relaxed palms near waist, upright spine. 2 next walking passing step, different leg crossing, hands gently swaying. 3 elegant short forward gliding sidestep, lead open palm low, hair lagging behind. 4 controlled backward retreating sidestep, lead open palm calmly warding in front, rear foot lifted. Clearly different leg silhouettes.

### air

保存：`soyo-extra-air-v1.png`

帧序：jump-rise, jump-fall, landing, guard-crouch

FOUR POSES: 1 ascending restrained jump knees lightly tucked, open hands balanced by sides, hair hanging down. 2 descending jump legs extending toward landing and both open palms lightly spread, hair lifting. 3 soft landing on bent knees, upper body dignified, palms low for balance. 4 grounded deep crouching guard with one open palm at face and the other protecting torso, feet firmly planted. Skirt naturally covers lap.

### defense

保存：`soyo-extra-defense-v1.png`

帧序：guard-standing, hit-high, hit-low, normal-windup

FOUR POSES: 1 upright open palm interception guard, lead palm upright at face, rear hand covering chest, narrow composed stance. 2 high hit reaction head and upper chest pulled back, hair swaying, startled restrained face, palms open. 3 body hit reaction shoulders curled forward and one hand against abdomen, knees bent, pained eyes, modest skirt. 4 preparation for palm attack, torso coiled slightly away right, rear open palm drawn to chest and forward palm measuring distance. No clenched fists.

### combat

保存：`soyo-extra-combat-v1.png`

帧序：palm-light, palm-heavy, cast-release, normal-recover

FOUR POSES: 1 quick precise single open-palm check straight toward RIGHT shoulder-height with modest weight shift, rear hand at chest. 2 powerful planted two-hand palm shove toward RIGHT, knees grounded, both palms extended together, hair trailing, distinct broad silhouette. 3 graceful musical spell and summon release gesture, one open hand lifted near shoulder and the other extended outward RIGHT palm-up, relaxed fingers beckoning, small composed smile. 4 quiet recovery after palm strike drawing lead open hand back toward waist while rear hand settles to chest, feet narrowing, soft expression.

### heal

保存：`soyo-extra-heal-v1.png`

帧序：heal-prepare, heal-channel, heal-release, heal-recover

FOUR POSES showing a distinct SELF-HEAL spell sequence. 1 prepare: Soyo brings right open hand to her own sternum, left hand below near abdomen, upright planted stance, eyes half lowered. 2 channel: both hands gently cupped over her OWN chest and heart, elbows relaxed outward, EYES CLOSED, calm concentrating expression, feet together. 3 release: eyes softly opening with relieved smile, one hand still at her OWN heart, other hand opens palm-up beside her cheek, hair and skirt lightly floating, modest. 4 recovery: exhale relief with faint smile, one hand brushing own collarbone, other slowly lowering to side, shoulders relax, grounded. All are full body, no equipment, hearts, glow or effects; renderer adds those later. NO milk/bottle/food.

### recovery

保存：`soyo-extra-recovery-v1.png`

帧序：knockdown-fall, knockdown-ground, getup, victory

FOUR POSES: 1 restrained falling-back knockdown with body diagonally leaning LEFT, arms open to catch herself, hair lifted, face still visible. 2 knocked down lying on her SIDE on invisible floor, knees modestly bent together, fully clothed skirt covers thighs, head lifted slightly, horizontal full body silhouette. 3 rising from one knee with one hand gently on bent knee, looking RIGHT with determined restrained expression, modest skirt. 4 quiet victory, standing poised with small polite smile and hand over chest, very slight gracious bow, other hand at side. No triumphant fists.
