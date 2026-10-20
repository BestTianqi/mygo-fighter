# 椎名立希 · 首批人物素材

状态：48张动作素材已作为第五位可玩角色接入战斗。技能方案见 `RIKI_SKILL_DESIGN.md`。

使用内置 imagegen 生成12组透明源图，共48张正常身材动作。官方立绘参考复制保存为 `reference/riki-official.png`，来源为原mota项目已经保存的官方参考；不使用旧版Q版立希作为身体或脸的参考。`anon-idle.png` 仅提供现有游戏线条、柔和赛璐璐上色和画面比例参考。

立希保留长深棕紫发、淡紫眼睛和眼下小痣，米灰褐色水手服连衣裙、红色领结、白色深边水手领、金色纽扣、深蓝及膝袜和棕色乐福鞋。持两根原木鼓棒，每只手一根。以首组待机为配色基准，后续分组同时参考官方立绘与首组源图。

图集帧序与逻辑高度见 `riki-actions.json`；运行图集为 `riki-runtime.webp`，提取的待机预览为 `riki-idle.png`。素材裁切沿用现有项目的透明连通区域与脚底锚点规则，统一在游戏逻辑高度235附近绘制，躺倒、蹲下及上举动作单独校准。

预览：`../riki-preview.html`，包含全部素材，离线可用，支持分组、单帧、轮播、左右翻转及现有三位角色的同高度对照。重新整理素材执行 `python tools/build_riki_assets.py`。正式版已接入选人和战斗，预览页继续作为素材检视工具。

质量修订：站立A组v1的轻脚鞋尖触边，v2修复了鞋尖但前两个人物的鼓棒相接，因此仅提取v2第四格为 `riki-standing-light-kick-v2.png` 替换所选轻脚帧；其他三帧继续使用v1。提取只进行透明源图的格子裁切和连通区域打包，不补绘、不改颜色。站立B组采用v2，修复原稿人物相接、额外鼓棒及朝向问题。未采用的原稿保留供对照。

## 修订提示词

首次生成时，normals-crouch、normals-air-a、normals-air-b三组在分组提示词后追加：

Keep the longest horizontal leg or drumstick BELOW the cell width: shorten extension or shift body toward cell center so every shoe and stick tip has at least 40px TRANSPARENT margin. Do not crop any figure.

percussion、finale两组在分组提示词后追加：

All four figures MUST fit their separate cells with at least 40px transparent inset. Silhouettes and sticks must NEVER touch another cell's figure; make figures slightly smaller in their cells to ensure clear separation and complete tips/shoes.

站立两组修订使用下列提示词，参考图依次为该组v1、首组待机、官方立绘：

Edit reference 1, a four-pose Riki transparent game sprite sheet. Preserve her face, identity, hair, exact beige sailor uniform, colors, linework and the four actions. Correct the BOTTOM-RIGHT low forward kick: its brown shoe is cut off by the right image border. Move this entire bottom-right figure LEFT within its cell, make that figure 10% smaller if needed, and redraw the missing toe so BOTH complete shoes and both drumsticks are fully visible with at least 40px clear transparent margin to every outer image edge. Keep the kick LOW and compact rather than straightening the leg widely. Other three poses should remain the same except minor repositioning needed for four separate cells. Exactly FOUR complete separate Riki figures, EXACTLY TWO wooden drumsticks per figure, one per hand. All face RIGHT. Reference 2 locks approved proportions/palette and reference 3 locks official face and clothing. True transparent RGBA; no backgrounds, shadows, glow, text or extra figures.

Correct reference 1, a four-pose Riki transparent game sprite sheet. Reference 2 is approved Riki identity/proportions/palette; reference 3 is official facial and clothing identity. Keep four actions: TOP-LEFT standing medium kick RIGHT, TOP-RIGHT standing heavy turning kick RIGHT, BOTTOM-LEFT crouching light stick jab RIGHT, BOTTOM-RIGHT crouching medium stick sweep RIGHT. CRITICAL FIXES: 1 ALL FOUR silhouettes must be separated by WIDE CLEAR TRANSPARENT GAPS; bottom-left and bottom-right drumsticks currently touch and must NOT TOUCH. 2 TOP-RIGHT currently has an extra stick and looks left: correct it to face/look RIGHT and have EXACTLY TWO drumsticks total, ONE in EACH hand, no spare stick. 3 ALL figures fit inside their own quadrant with at least40px transparent margins; shorten horizontal kicks and stick extensions and make all four figures 15% smaller if necessary. Every shoe, full leg, drumstick tip, hair and hand remains visible without cropping. Preserve her exact beige uniform with red ribbon, purple eyes, dark brown-purple long hair and official delicate 2D face. NORMAL proportions, not chibi. True transparent RGBA; no background, shadow, glow, labels, effects or extra figures.

## 首组提示词

Use case: illustration-story. Production asset: Shiina Taki / Shiina Riki (椎名立希), BanG Dream It's MyGO, a 2D fighting-game sprite sheet. EXACTLY FOUR separate full-body figures in a clean invisible 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Portrait sheet, generous transparent space between cells and 40px transparent safety margins; entire hair, drumsticks and both shoes fully inside each cell. Genuine TRANSPARENT RGBA background, no floor, shadow, checkerboard artwork, scenery, text, panels, labels or effects. Reference 1 is the OFFICIAL RIKI identity and school uniform: match her delicate official 2D face, long straight dark brown hair with subdued deep purple sheen extending below the waist, layered side-swept bangs, light violet/lilac eyes with sharp upper eyelash lines, determined restrained brows and small mouth. Preserve the tiny beauty mark below the eye on image-right in the official reference wherever visible. Do not make eyes red, hair black-blue or face generic. Reference 2 is the CURRENT GAME linework, neutral cel shading, body proportions and rendering style ONLY: DO NOT copy its pink hair, gray blazer, green skirt, tie or cheerful expression. NORMAL teen anime body around 6.5-7 heads tall, NOT chibi or superdeformed, same head/body scale across all poses. Riki's exact own uniform: muted beige/taupe long-sleeved double-breasted sailor school uniform with large white sailor collar edged by charcoal stripes, muted crimson red ribbon bow with long tails, two columns of small gold buttons, white-edged beige waist straps and gold button accents, matching beige pleated skirt, dark navy knee-high socks and plain brown loafers. Modest natural skirt coverage in all poses. Warm pale skin with subtle shading, no colored combat lighting. TWO thin natural maple wooden drumsticks, one in each hand, natural five-finger grips, drumsticks remain attached to hands, not swords or clubs. Most figures face RIGHT in readable three-quarter side view, match official identity and uniform details consistently. Full figures only, no separate face close-ups or extra portraits.
FOUR POSES: (1) Ready idle: small grounded stance, knees slightly bent, right drumstick angled forward at chest height, left drumstick held low near ribs, calm focused serious gaze RIGHT. (2) Forward walking heel-contact: left foot steps toward RIGHT, long hair lags gently, both drumsticks safely close to torso. (3) Passing walking step: right foot moves forward and opposite arm balances, distinctly different leg silhouette from pose 2. (4) Standing defense: feet planted, both forearms raised and TWO drumsticks crossed diagonally in front of upper chest, focused brows, full face readable. Keep all four poses restrained and on-model; reference official face closely.

## 后续分组公共提示词

Use case: illustration-story. Production asset: Shiina Taki / Shiina Riki (椎名立希), BanG Dream It's MyGO, a 2D fighting-game sprite sheet. EXACTLY FOUR separate full-body figures in a clean invisible 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Portrait sheet, generous transparent space between cells and 40px transparent safety margins; entire hair, drumsticks and both shoes fully inside each cell. Genuine TRANSPARENT RGBA background, no floor, shadow, checkerboard artwork, scenery, text, panels, labels or effects. Reference 1 is the OFFICIAL RIKI identity and school uniform: match her delicate official 2D face, long straight dark brown hair with subdued deep purple sheen extending below the waist, layered side-swept bangs, light violet/lilac eyes with sharp upper eyelash lines, determined restrained brows and small mouth. Preserve the tiny beauty mark below the eye on image-right in the official reference wherever visible. Do not make eyes red, hair black-blue or face generic. Reference 2 is the APPROVED RIKI sheet: lock its exact uniform taupe/beige, hair sheen, face, eye color, proportions and head size across the new poses. Reference 3 is the CURRENT GAME linework, neutral cel shading, body proportions and rendering style ONLY: DO NOT copy its pink hair, gray blazer, green skirt, tie or cheerful expression. NORMAL teen anime body around 6.5-7 heads tall, NOT chibi or superdeformed, same head/body scale across all poses. Riki's exact own uniform: muted beige/taupe long-sleeved double-breasted sailor school uniform with large white sailor collar edged by charcoal stripes, muted crimson red ribbon bow with long tails, two columns of small gold buttons, white-edged beige waist straps and gold button accents, matching beige pleated skirt, dark navy knee-high socks and plain brown loafers. Modest natural skirt coverage in all poses. Warm pale skin with subtle shading, no colored combat lighting. TWO thin natural maple wooden drumsticks, one in each hand, natural five-finger grips, drumsticks remain attached to hands, not swords or clubs. Most figures face RIGHT in readable three-quarter side view, match official identity and uniform details consistently. Full figures only, no separate face close-ups or extra portraits.

## air

文件：`riki-air-v1.png`。帧序：jump-rise, jump-fall, landing, guard-crouch。

FOUR POSES: 1 rising jump: knees naturally tucked, body upright and both drumsticks close to shoulders, long hair lifts, focused eyes RIGHT. 2 descending jump: one leg extends to land, the other knee bent, two drumsticks carried safely apart, long hair trailing upward. 3 springy low landing with deeply bent knees, both sticks near waist and one arm balancing, full face visible. 4 low crouching guard, knees folded and body compact, two drumsticks crossed before upper chest, looking RIGHT. Keep skirt naturally modest and all shoes visible; no airborne effects.

## motion

文件：`riki-motion-v1.png`。帧序：dash-forward, dash-back, normal-windup, normal-recover。

FOUR POSES: 1 forward dash RIGHT with low leaning torso, rear leg driving and front knee bent, two drumsticks drawn close to ribs, flowing hair, a powerful grounded run silhouette. 2 backward quick retreat LEFT while still facing and looking RIGHT, front foot skimming back and torso upright, arms guarding with two sticks, different silhouette from 1. 3 normal attack windup: wide planted stance, right drumstick drawn back near shoulder, left stick leading at chest level, hips turned ready to strike RIGHT. 4 normal recovery: front arm draws its stick back toward waist, rear stick settles near chest, returning to ready stance; softer posture than windup. No dust, motion streaks or effects.

## defense

文件：`riki-defense-v1.png`。帧序：hit-high, hit-low, knockdown-fall, knockdown-ground。

FOUR POSES: 1 high hit reaction: shoulders and head flinch backward, startled pained face, arms open defensively while still gripping one drumstick in each hand. 2 body hit reaction: torso folds slightly over abdomen, knees bending, one stick held low and other close to shoulder, pained determined face. 3 falling knockdown: body tilts backward diagonally in the air, legs bent and feet in frame, long hair sweeping out, two sticks still gripped, expressive surprise. 4 fully grounded knockdown lying on her SIDE, knees naturally bent and modest skirt draped over thighs, one forearm braced near face and the other near torso, both sticks visible near hands, full head-to-toe figure horizontal. No wounds, blood or floor.

## recovery

文件：`riki-recovery-v1.png`。帧序：getup, victory, throw-windup, throw-release。

FOUR POSES: 1 getting up from one knee: one knee on invisible ground, other foot planted, one drumstick braced near thigh and the other in raised hand, determined recovering look RIGHT. 2 restrained victory: upright relaxed stance, tiny relieved closed-mouth smile, one drumstick lifted at shoulder and other lowered near hip, no huge grin. 3 throw windup: leaning forward toward RIGHT with one bent arm reaching to hook an imaginary opponent's near shoulder, other arm ready close to torso; still one drumstick safely in each hand. 4 throw release: body turns firmly at waist, one forearm sweeps down-right and stance lowers, front foot plants and hair swings, clear forceful grappling follow-through; NO second person, no extra hands, keep drumsticks visible.

## normals-standing-a

文件：`riki-normals-standing-a-v1.png`。帧序：standing-light, standing-medium, standing-heavy, standing-lightKick。

FOUR STANDING NORMAL IMPACTS facing RIGHT: 1 LIGHT stick jab: leading hand extends one maple drumstick horizontally RIGHT at upper chest height, rear hand's stick guards ribs, quick compact extension. 2 MEDIUM alternating stick strike: left stick sweeps RIGHT at chest height while right stick is drawn back beside shoulder, hips turn, wider reach than 1. 3 HEAVY drumstick smash: both arms commit toward RIGHT in a forceful diagonal downward crossing strike, lowered center of gravity and planted wide stance, serious face, BOTH sticks distinct and held in hands. 4 LIGHT FOOT poke: short low forward front-foot kick RIGHT at shin height, torso only slightly leans back, both drumsticks close to chest. No trails or effects.

## normals-standing-b

文件：`riki-normals-standing-b-v1.png`。帧序：standing-mediumKick, standing-heavyKick, crouch-light, crouch-medium。

FOUR NORMAL IMPACTS facing RIGHT: 1 standing MEDIUM kick: front leg extends RIGHT at waist height, rear foot planted, torso leans slightly back, both sticks held safely near shoulders. 2 standing HEAVY rotating kick: forceful waist-height sweeping round kick RIGHT, body turned and long hair swings outward, both sticks close to ribs, no splits or above-head kick. 3 CROUCHING light stick jab: deep low stance with both feet close to ground, leading stick extends horizontally RIGHT near opponent knee/waist height, other stick protects chest. 4 CROUCHING medium stick sweep: low wide stance, one drumstick sweeping outward RIGHT at lower torso level, other held behind shoulder, torso rotated more strongly than 3. Natural modest skirt coverage.

## normals-crouch

文件：`riki-normals-crouch-v1.png`。帧序：crouch-heavy, crouch-lightKick, crouch-mediumKick, crouch-heavyKick。

FOUR LOW NORMAL IMPACTS facing RIGHT: 1 crouching HEAVY stick uppercut: deep low stance, both arms drive TWO drumsticks diagonally upward RIGHT from below chest, strong planted legs; character herself remains crouched. 2 crouching LIGHT foot poke: one knee folded low, short front-foot poke RIGHT along ground, torso guarded with two sticks close to chest. 3 crouching MEDIUM extending low kick: rear knee deeply bent, front leg extends farther RIGHT at shin height, torso leans back for balance, two sticks held separately by hands. 4 crouching HEAVY ground sweep: very low rotating sweep with one leg extended RIGHT near ground, supporting knee bent, body turned, long hair swinging, both sticks close to torso. No splits, upskirt or effects, full shoes visible.

## normals-air-a

文件：`riki-normals-air-a-v1.png`。帧序：air-light, air-medium, air-heavy, air-lightKick。

FOUR AIRBORNE NORMAL IMPACTS facing RIGHT, no jump effects: 1 airborne light stick jab: knees tucked naturally, one drumstick quickly extends RIGHT at chest height, other near ribs. 2 airborne medium alternating cross-body strike: one knee raised and other leg tucked, one stick sweeps RIGHT while other drawn back at shoulder, torso twists. 3 airborne heavy overhead stick smash: torso leans forward RIGHT, BOTH drumsticks strongly arc downward from above head, bent knees tucked behind, long hair flows up-left, complete figure and stick tips visible. 4 airborne light foot kick: short front-foot kick RIGHT below waist, other knee tucked, two sticks held near shoulders. Modest naturally draped skirt and normal anatomy.

## normals-air-b

文件：`riki-normals-air-b-v1.png`。帧序：air-mediumKick, air-heavyKick, calibrate-windup, calibrate-release。

FOUR POSES facing RIGHT: 1 airborne medium kick: leading foot extends RIGHT at waist height, other leg bent below body, balanced torso, two drumsticks guarding chest. 2 airborne heavy turning kick: committed midair round kick RIGHT at torso height with bent supporting leg, long hair fans back, both sticks held close, no extreme splits. 3 G rhythm calibration preparation, STANDING grounded: upright centered stance, head slightly bowed and focused eyes, TWO drumsticks raised separately just before crossing at upper chest. 4 G rhythm calibration release, STANDING grounded: the tips of her two wooden drumsticks meet in a neat X in front of chest as she taps them together, firm focused face and small lifted chin, feet shoulder-width apart. No drums, floating notes or effects.

## percussion

文件：`riki-percussion-v1.png`。帧序：roll-release, rush-impact, overhead-impact, ground-shock。

FOUR SPECIAL SKILL IMPACTS facing RIGHT: 1 I roll flurry: planted stance, both arms reach RIGHT at chest height in alternating drumming positions, one stick horizontal forward and other diagonal just above, intent serious eyes; EXACTLY TWO drumsticks, no phantom duplicate limbs. 2 C cymbal rush: powerful low forward lunging step RIGHT, leading knee bends and back leg pushes, one drumstick thrust forward at chest while other guards ribs, long hair trails LEFT. 3 U overhead smash: grounded wide stance, both drumsticks sweep downward toward RIGHT from an overhead starting arc, forearms high and torso leaning forward, focused gritted determination, stick tips fully visible. 4 T bass stomp: weight drops onto front foot in a strong stamping action, knees flex, torso slightly lowered, one stick points down-right beside thigh and other is held near shoulder, groundward force in silhouette. NO drumkit, instrument objects, notes, circles, particles or trails.

## finale

文件：`riki-finale-v1.png`。帧序：uppercut-impact, eight-beat-release, super-windup, super-release。

FOUR FEATURE SKILL POSES facing RIGHT: 1 Y rising beat: short rising jump, one knee lifted and other leg trailing below, both arms power TWO drumsticks diagonally UP-RIGHT above head in a clear anti-air uppercut silhouette; full stick tips and shoes in frame. 2 L eight-beat finish: wide planted step forward RIGHT, torso rotates with BOTH hands driving two drumsticks together across front at upper torso height, determined expressive face, strong forward follow-through. 3 P ultimate windup: upright wide stance, BOTH arms raise two drumsticks HIGH above head in an open V, chin lifted and fierce focused eyes, long hair spread naturally behind, full tips fit cell. 4 P ultimate release: both arms slam two drumsticks down-forward RIGHT to chest/waist height, front knee deeply bends and rear foot planted, hair swings with force, mouth slightly open with concentrated shout. No stage, drumkit, glow, shockwaves, motion streaks or text; only character and two sticks.
