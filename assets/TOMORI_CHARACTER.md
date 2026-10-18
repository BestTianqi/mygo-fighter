# 高松灯初版角色

2026-10-18。使用内置 imagegen 生成，透明 RGBA，六张源图共24张正常身材动作，未采用旧版Q版图。官方参考保存在 `reference/tomori-official.png`；已有 `anon-idle.png` 只用作游戏线条、色调和身体比例参考。原始提示词如下。

## 角色与游戏规则

短灰紫发、粉棕色眼睛、灰紫校服外套、深橄榄格裙与长袜，持黑色麦克风。拘谨待机、紧凑近身动作，歌唱施放以表情和伸手姿势区分。支持双方选人、电脑、同角色对战、练习与触屏，沿用六张大地图和动态镜头。

- J/K：轻击、重击，8/16原始伤害；U投技，18伤害。
- I 微光音符：20共鸣，地面起手140ms，伤害12，速度380、寿命1800ms。
- T 诗句回声：30共鸣，地面起手230ms，伤害18，速度360、较宽音波，寿命1800ms。
- L 迷途之歌：60共鸣，原地施放1100ms，在260/450/640ms发出三段独立音波，每段原始伤害8；连续命中沿用伤害衰减。
- 三种歌声仅在地面或平台发动；施法可被打断，后续音波不再发出，已发出的继续前进。飞行物可被防御、钢板和其他飞行物挡下；暂停冻结、重开清除。2P键位4 / Enter / 3，投技5。
- 当前音效为合成器提示音，没有使用角色语音。

图集：`tomori-runtime.webp`；待机：`tomori-idle.png`；帧序：`tomori-actions.json`；完整单文件游戏：`../index.html`。

## 公共提示词

Use case: illustration-story. Production asset: Takamatsu Tomori (高松灯) from BanG Dream It's MyGO, playable 2D fighting game full-body animation sprites. EXACTLY FOUR isolated figures in an invisible 2x2 grid, order top left / top right / bottom left / bottom right, transparent RGBA. Reference 1 is the OFFICIAL TOMORI illustration: absolutely match her facial identity, short muted ash-purple/gray bob hair, asymmetrical layered bangs, side hair tucked behind ear, large slightly drooping rose-brown/pink-brown eyes, small nose and shy restrained mouth. Reference 2 is the EXISTING GAME RENDER STYLE AND PROPORTIONS ONLY, do NOT give Tomori the pink hair, long hair or exuberant face of that character. Draw NORMAL TEEN ANIME BODY, 6.5-7 heads tall, NOT CHIBI. Same head size between all cells. Fine clean official 2D anime lineart, subtle neutral cel shading. Exact school uniform: light muted gray-lavender blazer, white trim and shirt, dark olive tie with diagonal gold stripes, dark green/olive plaid pleated skirt with fine gold grid, dark desaturated green knee socks, black loafers. Modest natural skirt coverage in all poses. Hold ONE small black handheld microphone in RIGHT hand in all four poses, natural five-finger grip. Character faces RIGHT in 3/4 side view; whole body head to shoes inside each cell, clear 40px transparent margins. No scenery, floor, shadows, soundwave effects, colored lighting, labels or text. Tomori is shy and earnest, tightly held microphone and compact posture rather than aggressive boxing or Soyo's elegant open-palm martial style.

## presence

输出：`tomori-presence-v1.png`

帧序：idle, walk-contact, walk-pass, guard-standing

追加提示词：

FOUR POSES: 1 idle: small ready stance, knees softly bent, microphone in right hand close to chest, left hand lightly steadying the right wrist, anxious but determined eyes looking RIGHT, reserved closed mouth. 2 careful forward walking heel-contact, microphone protected near sternum, front foot stepping RIGHT. 3 next walking passing-step with different leg placement and free hand slightly balancing, still holding mic at chest. 4 planted standing guard, both forearms raised compactly to protect face, microphone held safely in right hand against near shoulder, concerned focused expression.

## air

输出：`tomori-air-v1.png`

帧序：jump-rise, jump-fall, landing, guard-crouch

追加提示词：

FOUR POSES: 1 rising jump with knees tucked and microphone protected at chest, left hand open for balance, determined shy face. 2 descending jump with legs extending toward floor, microphone in right hand, left arm spread to steady herself. 3 soft bent-knee landing, body lowered, microphone against collarbone, left hand balanced low. 4 deep crouching guard, knees folded modestly, both forearms compactly protecting chest/face with microphone visible in right hand. Naturally draped modest skirt, no underwear.

## combat

输出：`tomori-combat-v1.png`

帧序：normal-windup, mic-light, mic-heavy, normal-recover

追加提示词：

FOUR POSES: 1 compact attack preparation: right hand draws microphone close to shoulder, left hand clenched lightly before chest, weight shifting to back foot. 2 quick short LEFT-hand forward checking jab toward RIGHT, right hand keeps microphone at chest, narrow stance, no showy swing. 3 planted LEFT forearm/shoulder shove to RIGHT with one forward step, right microphone held safely near ribs, lowered stance, earnest concentrated face. 4 recovering: left hand draws back, right microphone settles between both hands near chest, feet narrowing, calm but uncertain look. These are compact self-defense, not big action heroine punches.

## voice

输出：`tomori-voice-v1.png`

帧序：note-release, echo-windup, echo-release, chorus-release

追加提示词：

FOUR SINGING POSES: 1 soft note release: right microphone at mouth, lips gently parted, left hand near chest, eyes earnest and open. 2 poetry echo preparation: microphone held with BOTH hands at mouth, head slightly bowed, eyes half closed, compact grounded stance. 3 poetry echo release: microphone in right hand at lips, mouth OPEN naturally singing, left hand reaches forward toward RIGHT in a tentative earnest appeal, slight forward lean. 4 powerful chorus release: right microphone close to open singing mouth, eyebrows emotionally determined, left hand extending fully RIGHT with open fingers, wider planted stance, straight spine and lifted chin. NO effects baked into art, no floating text or music icons.

## defense

输出：`tomori-defense-v1.png`

帧序：dash-forward, dash-back, hit-high, hit-low

追加提示词：

FOUR POSES: 1 short forward running dash to RIGHT, low compact torso, microphone protected with right hand near chest, left arm counterbalancing, urgent determined face. 2 startled quick BACKSTEP toward LEFT while still looking RIGHT, right microphone at chest, left palm held out to regain distance, different leg silhouette. 3 high hit reaction: head/shoulders pulled back, open left hand flinching at face, right hand still holding mic, startled distressed eyes. 4 body hit reaction: knees bent, left hand over abdomen, torso slightly folded, right microphone near chest, pained concerned expression.

## recovery

输出：`tomori-recovery-v1.png`

帧序：knockdown-fall, knockdown-ground, getup, victory

追加提示词：

FOUR POSES: 1 falling-back knockdown, body diagonal leaning LEFT, knees modestly together, right hand retains microphone, left arm tries to balance. 2 lying on SIDE on invisible floor, horizontal full body, knees bent together, skirt naturally covering lap and thighs, left forearm supporting head slightly, right microphone safely held near chest. 3 rising from one knee, left hand steadying bent knee, right microphone held close, timid but determined eyes looking RIGHT. 4 reserved victory: standing shyly with a tiny relieved smile, shoulders relaxed, microphone gently held in both hands before chest, small polite head dip, NO raised fist or broad exaggerated grin.
