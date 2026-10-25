# 要乐奈 · 首批人物素材

状态：已接入正式游戏，角色编号3，为第四名可选角色；另附独立离线素材预览。

另新增四帧抹茶芭菲投掷动作，总计52帧。来源、独立图集与内置imagegen提示词见 `RANA_PARFAIT.md`；此文与预览页记录原48帧基础动作。

使用内置 imagegen；所有最终透明原稿、图集和官方参考均保存在本独立项目。官方参考来自原 mota 项目已经保存的 `official_refs/mygo_rana_official.png`，复制为 `reference/rana-official.png`。没有使用旧版Q版角色作为形体参考。现有 `anon-idle.png` 仅提供线条、上色和正常身材比例参考。

保留官方的银白短发、右眼金色与左眼浅蓝色（正面画面左金右蓝）、黑色露肩破损下摆上衣、白色内搭、黑色系带短靴。战斗道具为统一的酒红色、象牙白护板电吉他；属于本游戏的动作设计。后续分组同时参考官方图和首组待机图，以固定面部、衣服和吉他配色。朝向翻转用于动作检查；正式实战若需保持异色瞳解剖侧别应使用另一朝向素材。

共12组48个动作，包含18个站立/蹲下/空中基础攻击、待机移动防御受击、投技，以及吉他拨弦、突进、上挑、滑踢、俯冲和独奏的技能姿势。动作已绑定战斗时序，正常状态保持统一配色；绿色弦波使用画布叠加，不改变角色源图。技能方案与数值见 `RANA_SKILLS.md`。

离线查看：`../rana-preview.html`。支持全部动作切换、分组轮播、镜像和现有三位角色同高度对照。源图帧序与逻辑高度见 `rana-actions.json`，打包结果为 `rana-runtime.webp`、`rana-frames.json` 和 `rana-idle.png`。沿用项目透明连通区域提取与脚底锚点。重新整理执行 `python tools/build_rana_assets.py`。

## 源图间距修订

吉他技能组v1的左上靴尖与左下琴头相接，导致透明连通区域只识别出三个角色。v2通过内置imagegen缩小并重新安排格内位置，保留动作和配色，最终清单使用 `rana-guitar-v2.png`，v1仅留作原稿对照。

修订提示词（参考依次为v1、官方参考、首组待机）：

Edit reference 1, a four-pose transparent Kaname Rana fighting-game sprite sheet. Keep exactly these four actions, face, silver bob, heterochromia, black/white stage outfit, boots and wine-red guitar unchanged in style and palette. CRITICAL CORRECTION: top-left figure's lower boot currently TOUCHES bottom-left figure's raised guitar headstock, merging the silhouettes. Make ALL FOUR complete figures 18% SMALLER and recenter each INSIDE its own quadrant with WIDE CLEAR TRANSPARENT GAPS. Each figure including guitar/headstock must be entirely inside its own 2x2 quadrant, at least 48px from quadrant edges; no overlap or touching. Top-left grounded strum, top-right low rush, bottom-left knee-raised rising guitar uppercut, bottom-right low boot slide. Keep face RIGHT and full boots/hair/guitar visible. Reference 2 locks official face and costume; reference 3 locks the approved normal anime body proportions. Anatomical right iris gold, anatomical left iris pale blue; when both visible preserve two different eye colors. Exactly ONE instrument and TWO arms per figure. True transparent RGBA background, no scenery, floor, glow, effects or text.

## 首组及后续公共提示词

Use case: illustration-story. Production asset: Kaname Rana (要楽奈 / 要乐奈), BanG Dream It's MyGO, 2D fighting game. EXACTLY FOUR separate full-body figures in invisible 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Portrait sheet, genuinely transparent RGBA background. Make each figure small enough for a WIDE transparent gap between figures and 48px clear margin to all edges. ENTIRE guitar, head, hair and both boots visible; no contact between separate silhouettes. No floor, shadows, glow, effects, labels, grid lines, portraits or extra figures.
Reference 1 is official Rana: match her delicate original 2D face, short silver-white bob with faint lavender-grey shadows, straight irregular bangs, small longer wisp at nape, GOLDEN anatomical RIGHT eye (viewer-left in front view), PALE BLUE anatomical LEFT eye (viewer-right in front view). Keep both eye colors when both visible, quiet curious catlike expression, small mouth. NORMAL slim anime teenager proportions 6.5-7 heads tall, NOT chibi, consistent head/body scale and cel shading with game.
Exact official stage outfit: loose dark CHARCOAL BLACK off-shoulder oversized elbow-sleeve tunic, visible white straps, torn/frayed horizontal slits ONLY near hem, solid WHITE long-sleeve underlayer extending below black tunic, short white inner hem fully covering hips, bare legs, black lace-up ankle combat boots with yellow sole stitching. Keep outfit modest naturally draped in every action. Neutral gentle cel shading, same black/white outfit and silver hair colors throughout, no colored lighting.
One compact deep wine-red solid-body ELECTRIC GUITAR with ivory pickguard, dark fingerboard, six strings, black strap crossing shoulder; SAME instrument every pose. Strap attaches naturally; guitar and its neck connected to body/hands, no detached necks, no spare instruments. It is a game combat prop. All characters face/look RIGHT in three-quarter side view, allowing delicate recognizable official face and eyes.


首组追加：

FOUR POSES: (1) idle: relaxed small ready stance, feet apart, left hand on guitar neck pointing diagonally up RIGHT, right hand at strings, blank curious gaze RIGHT; (2) forward walking heel contact RIGHT, leading leg forward, guitar held close across waist; (3) passing walking step RIGHT, opposite knee moving forward, slight bobbing torso, guitar held steady; (4) standing guard, knees slightly bent, turn guitar diagonally across chest like a small shield, left hand on neck and right hand steadying body. Reference 2 provides ONLY existing game's linework, cel-shading, normal body proportions; do NOT copy its pink hair or school uniform. Use Rana official outfit from reference 1.

后续各组追加（参考1官方、参考2首组、参考3现有爱音仅作渲染参考）：

Reference 2 is APPROVED Rana presence sheet: lock EXACT face, silver hair, charcoal and white layered outfit, NORMAL proportions, wine-red guitar with ivory pickguard. Reference 3 provides only current game's clean cel shading; do NOT copy pink hair or school uniform. Preserve the anatomy of ONE guitar connected by shoulder strap and two hands. No duplicate guitar necks. Delicate official face in all poses.

## air

文件：rana-air-v1.png；帧序：jump-rise, jump-fall, landing, guard-crouch。

FOUR POSES facing RIGHT: 1 rising jump, both knees compactly tucked, guitar held close across waist pointing diagonally up right; 2 descending jump, one boot extends down ready to land while other knee bends, guitar close; 3 low springy landing, knees deeply bent, feet apart, torso leans gently forward and guitar near ribs; 4 deep crouching defense, one knee folded low, guitar held diagonally across chest, calm focused eyes. Keep all poses distinct and complete, modest white underlayer draped over hips.

## motion

文件：rana-motion-v1.png；帧序：dash-forward, dash-back, normal-windup, normal-recover。

FOUR POSES: 1 low quick dash RIGHT, torso forward, bent leading knee and driving back leg, guitar horizontal close across waist; 2 backward hop retreat LEFT while facing and looking RIGHT, torso leans back, one bent knee raised, guitar guards chest; 3 guitar attack preparation, planted stance, both hands lift the red guitar slightly to her rear LEFT with neck diagonally upward, ready to swing RIGHT; 4 guitar attack recovery, low stance, guitar brought back toward center after a swing to RIGHT. Show entire guitar and boots, compact poses in separate quadrants.

## defense

文件：rana-defense-v1.png；帧序：hit-high, hit-low, knockdown-fall, knockdown-ground。

FOUR POSES: 1 high hit reaction, head and shoulders flinch backward LEFT, startled face, still holding guitar close to waist; 2 body hit reaction, torso folds and knees buckle, face pained, both hands clutch guitar near abdomen; 3 falling knockdown, whole body tilted backward diagonally LEFT in midair, knees bent, guitar held safely against chest, surprised face; 4 grounded knockdown lying on her SIDE with knees bent and modest tunic/white underlayer covering hips, entire body horizontal, guitar held close over torso, both boots fully visible. No floor, wounds or blood.

## recovery

文件：rana-recovery-v1.png；帧序：getup, victory, throw-windup, throw-release。

FOUR POSES: 1 getup from one knee, front boot planted, guitar against waist, one hand steadies neck and torso rises RIGHT; 2 quiet victory, standing relaxed holding guitar, very small satisfied smile with bright golden and blue eyes, right hand gives small catlike curled-finger gesture near cheek; 3 throw windup, leading open hand reaches RIGHT to grab imaginary opponent, guitar hangs secured by shoulder strap and other hand; 4 throw release, torso rotates and leading open hand sweeps down RIGHT, planted lowered stance, guitar remains strapped against waist; NO second person or extra arms.

## normals-standing-a

文件：rana-normals-standing-a-v1.png；帧序：standing-light, standing-medium, standing-heavy, standing-lightKick。

FOUR STANDING ATTACK IMPACTS RIGHT: 1 LIGHT compact open-hand cat-paw palm jab RIGHT at chest height, rear hand holds guitar neck and strap supports body; 2 MEDIUM guitar-body check RIGHT, both hands guide guitar body forward at chest/waist, elbows bent; 3 HEAVY diagonal guitar swing down RIGHT, both hands firmly hold instrument, deep planted stance, follow-through clear but guitar compact fully within cell; 4 LIGHT short low boot poke RIGHT at shin height, supporting knee bent, guitar held against chest. Four distinct silhouettes. Do not overextend guitar toward neighbor.

## normals-standing-b

文件：rana-normals-standing-b-v1.png；帧序：standing-mediumKick, standing-heavyKick, crouch-light, crouch-medium。

FOUR ATTACK IMPACTS RIGHT: 1 standing MEDIUM front kick at waist height, compact bent leg extension RIGHT, guitar held close; 2 standing HEAVY turning round kick RIGHT at torso height, body rotates and bob hair swings, both hands keep guitar against ribs, no splits; 3 deep CROUCH LIGHT cat-paw palm jab RIGHT, rear hand on strapped guitar neck, knees low; 4 CROUCH MEDIUM guitar-body shove RIGHT at lower torso height, both hands grip instrument, low stance turned more strongly than 3. Keep guitar and shoes entirely inside each quadrant with wide gaps.

## normals-crouch

文件：rana-normals-crouch-v1.png；帧序：crouch-heavy, crouch-lightKick, crouch-mediumKick, crouch-heavyKick。

FOUR LOW ATTACKS RIGHT: 1 crouching HEAVY rising guitar strike, torso remains low as both arms drive guitar diagonally up RIGHT, knees folded; 2 crouching LIGHT foot poke, one knee folded, short front boot poke along ground RIGHT, guitar close across chest; 3 crouching MEDIUM low kick, front boot extends further RIGHT at shin height, rear knee bent, guitar protects ribs; 4 crouching HEAVY rotating low sweep RIGHT, one leg extended compactly near ground and supporting knee bent, body turned, guitar held tight. Entire body and guitar visible, modest outfit coverage, no splits or upskirt.

## normals-air-a

文件：rana-normals-air-a-v1.png；帧序：air-light, air-medium, air-heavy, air-lightKick。

FOUR AIRBORNE ATTACK IMPACTS RIGHT: 1 light cat-paw palm jab RIGHT with knees tucked and other hand steadying strapped guitar; 2 medium guitar-body check RIGHT, both arms push guitar forward compactly with one knee lifted; 3 heavy overhead guitar smash down RIGHT, torso leans forward, both arms hold instrument in downward swing, knees bent behind, ENTIRE guitar must fit cell; 4 light short forward boot poke RIGHT below waist, other knee tucked, guitar held close to ribs. No effects, flight trails or floor. Naturally draped modest outfit.

## normals-air-b

文件：rana-normals-air-b-v1.png；帧序：air-mediumKick, air-heavyKick, tune-windup, tune-release。

FOUR POSES RIGHT: 1 airborne medium kick, compact leading boot extended RIGHT at waist height, other knee bends, guitar held at chest; 2 airborne heavy turning kick, body twists and forward boot sweeps RIGHT at torso height, other leg tucked, guitar close, no splits; 3 STANDING guitar tuning preparation, feet relaxed apart, looking gently down at neck, left hand touches tuning peg near headstock and right hand ready over strings; 4 STANDING tuning release, right hand softly plucks strings, left hand returns to fretboard, eyes lift RIGHT with focused calm face. Final two grounded and visibly different from airborne poses, no notes/effects.

## guitar

文件：rana-guitar-v1.png；帧序：pick-release, rush-impact, rising-impact, low-slide。

FOUR DISTINCT GUITAR SPECIAL IMPACTS RIGHT: 1 pick wave release, grounded feet apart, right hand finishes bold downward strum and left fingers on neck pointing diagonally RIGHT, focused face; 2 catlike guitar rush impact, very low long lunge RIGHT with torso forward and guitar body braced leading at chest, back leg driving, entire instrument compact; 3 rising guitar uppercut, front knee raised and both hands lift guitar diagonally UP RIGHT, body elongated in rising motion but full headstock within cell; 4 low boot slide, one leg extends compactly along ground RIGHT and rear knee folded, torso reclines slightly, guitar held close across abdomen. No energy waves, trails, effects or extra props.

## finale

文件：rana-finale-v1.png；帧序：dive-impact, solo-release, super-windup, super-release。

FOUR SIGNATURE GUITAR POSES RIGHT: 1 airborne dive strike, body leans diagonally DOWN RIGHT, front boot extends down-right and rear knee bends, guitar held close like a shield, catlike pounce; 2 intense standing solo, feet wide apart and knees bent, left hand high on fretboard and right picking fast on strings, head tilts slightly toward instrument yet face readable; 3 super windup, guitar neck raised diagonally up RIGHT, torso turns and right picking hand drawn back at shoulder before striking strings, grounded tense legs; 4 super release, wide planted stance, torso leans forward RIGHT, right hand finishes forceful strum below guitar and left hand grips neck, determined quiet face, fully readable iconic silhouette. No glow, waves, text, notes, duplicate limbs or effects.
