# 高松灯 · 凑企鹅变身

使用内置 imagegen 生成8张透明源图，共32张企鹅形态动作；参考用户GIF `reference/tomori-penguin-reference.gif` 和现有 `tomori-idle.png` 的脸。原有人形素材保持原状。

## 视频参考与改编

已使用 agent-reach 的 B站公开API获取并用浏览器逐秒查看用户指定的[《🐧盘点凑企鹅各项技能🐧》](https://www.bilibili.com/video/BV1mTXKB4EjG/)（byd小绫，约21秒）。视频依次展示：飞踢、糖哭、hey?、唐笑、咕咕嘎嘎。外形按GIF的黑色企鹅身躯、奶油色腹部、黑色鳍与橙色蹼脚重绘，保留灯的短发和粉棕色眼睛。下面的能量、伤害、防守与连段规则是网页格斗玩法改编。

## 操作与规则

- 灯 G / 2P Delete / 手机「凑企鹅」：消耗50共鸣，地面立即变身，无变身前摇或收招锁定，可马上移动、冲刺、跳跃和接招；持续20000ms有效战斗时间，不叠加或刷新时间。短暂变身亮光只作为画面效果。暂停和命中停顿冻结计时。到期恢复人形，当前企鹅专属招式与缓存取消，已发出的飞行物继续飞行；HP和能量不变。回合结束与重开清除形态。
- 形态移动375、跳跃640；普通灯为315、590。站立/蹲下/空中各6种基本攻击，J/H/K为鳍拍/顶撞，N/M/逗号为蹬脚/扫脚；普通攻击免费。B为投技（2P5）。
- C / 空中F 飞踢：10共鸣，16伤害，前移跃踢、击倒；一跳只允许一次空中动作，空中普通技命中可接飞踢，落地有收招。2P Home / PageDown。
- U 糖哭·反击：15共鸣，80–700ms内抵消一次正面打击或飞行物，回击波伤害10；起手、背后与投技可破。2P小键盘*。
- I hey?：10共鸣，短程波伤害10。2P小键盘4。
- T 唐笑·震荡：20共鸣，周围200范围、上下180范围，伤害12，击退方向远离企鹅；可防御。2P小键盘Enter。
- L 咕咕嘎嘎：40共鸣，在180/330/480ms分别发出三次音波，单次原始伤害8，连段沿用衰减。2P小键盘3。
- 企鹅波、笑声和基础攻击均沿用格挡、钢板与地形规则；糖哭不会阻挡投技。

## 原视频语音

按用户要求截取上方指定视频的五段原始音轨，配给飞踢、糖哭、hey?、唐笑和咕咕嘎嘎；保留片段内背景声。来源和截取时间见 `audio/penguin-voices.json`，MP3原声片段位于 `audio/penguin-*.mp3`。仅做响度统一、单声道压缩和首尾短淡入淡出，未合成或克隆声音。

点击现有「音效开」即可启用。每次成功发动对应技能播放一次，同一角色的新语音替换上一次，两位玩家独立播放；咕咕嘎嘎三段攻击共用一段完整原声。暂停保留播放进度，继续后接着播放；关闭音效、受击打断、变身到期、重开和回合结束清除对应语音。其他招式保留原合成音效。

五段MP3一并嵌入单文件HTML，离线不请求视频站点。重新切片仅开发时需要 `imageio-ffmpeg`，运行 `python tools/extract_penguin_voices.py 本地原视频.mp4`；重新打包仍使用 `python tools/build.py`。

图集 `tomori-penguin-runtime.webp`，帧序与逻辑高度 `tomori-penguin-actions.json`。前后冲刺复用企鹅步伐/顶撞姿势，受击共用一张形态反应。企鹅胜利图保留在图集；回合结果恢复人形，采用正常灯的结果姿势。所有游戏图片嵌入 `../index.html`。

## 公共提示词

Use case: illustration-story. Production asset: "凑企鹅" Tomori penguin transformation for a 2D fighting game. EXACTLY FOUR isolated full-body penguin figures in invisible 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. TRANSPARENT RGBA, no colored background, floor, drop shadows, labels, text or effects. Reference 1 is the user's penguin GIF: match its plump upright teardrop-shaped BLACK penguin body, large warm ivory/cream belly, long thin BLACK FLIPPERS, short orange webbed penguin feet, and human anime Tomori HEAD on top. Reference 2 is the already-approved game Tomori idle: use her recognizable 2D facial identity, pink-brown eyes and short layered bob, no clothing from it. Hair should be dark charcoal ash-brown with subtle muted purple highlights, closer to GIF. Keep her delicate official 2D face, small nose, soft rose-brown eyes with clear lashes, short side-swept layered bob. Clean anime cel-shaded 2D rendering matching the existing game, subtle neutral colors; NOT photorealistic or 3D. This is a PENGUIN body with anime girl's head, NOT a girl wearing a penguin suit and NOT a chibi human. NO human hands, human legs, fingers, uniform, microphone, beak, or long hair. Only black flippers and orange webbed feet. Cream belly MUST stay cream throughout. Each complete figure inside its own cell with 40px empty margins, head and feet never cropped; same head/body scale across four cells. Standing penguin total height about 3.5 heads, head naturally attached at top of penguin body. All face RIGHT in 3/4 view except when pose necessarily rotates. Preserve identity and body silhouette consistently.

## presence

输出：`tomori-penguin-presence-v1.png`

帧序：idle, walk-contact, walk-pass, guard-standing

FOUR POSES: 1 idle: upright rounded penguin, short orange feet apart, black flippers hanging slightly out, calm slightly puzzled Tomori face gazing RIGHT. 2 waddling walk heel/contact with left webbed foot forward RIGHT, body tilting gently, flippers balancing. 3 opposite passing waddling step with right webbed foot lifted, different silhouette and bob. 4 standing defense, two BLACK FLIPPERS raised across face and chest, focused eyes; no human hands.

## air

输出：`tomori-penguin-air-v1.png`

帧序：jump-rise, jump-fall, landing, guard-crouch

FOUR POSES: 1 rising jump, penguin flippers out like little wings, orange webbed feet tucked beneath cream belly, surprised determined Tomori face. 2 descending jump, flippers lifted sideways and orange feet pointing down to land, bob hair lifts. 3 soft squat landing, rounded body crouching low with feet splayed, flippers low, face visible. 4 deep low guard, penguin crouched down with flippers protecting cheeks and belly, head tipped forward, no human limbs.

## flippers

输出：`tomori-penguin-flippers-v1.png`

帧序：flipper-light, flipper-medium, flipper-heavy, kick-light

FOUR ATTACK POSES: 1 quick short leading BLACK FLIPPER slap straight RIGHT at chest level, other flipper at belly. 2 wider two-flipper crossing slap, body twisted slightly, serious face. 3 committed heavy body/shoulder bump RIGHT, rounded belly leaning forward, one flipper drawn back, lower grounded stance. 4 short low orange WEBBED FOOT poke toward RIGHT, body leans back slightly and flippers balance, no long human legs. Readable different attack silhouettes.

## kicks

输出：`tomori-penguin-kicks-v1.png`

帧序：kick-medium, kick-heavy, normal-windup, normal-recover

FOUR POSES: 1 medium forward orange webbed-foot kick to RIGHT at belly level, body leaning back and flippers out. 2 large spinning penguin webbed-foot sweep to RIGHT, body twisted into rounded diagonal, flippers extended, head still readable. 3 attack windup: small compressed crouch, belly leaning backward, flippers drawn close ready to slap, focused Tomori eyes. 4 recovery: feet settle down and flippers return toward sides, body upright, calm soft face. Do not add human legs.

## specials

输出：`tomori-penguin-specials-v1.png`

帧序：flying-kick, cry-counter, hey-release, laugh-release

FOUR SPECIAL SKILL POSES based on the supplied meme video: 1 FLYING KICK: whole penguin body leans diagonally back in midair and both orange webbed feet thrust forward RIGHT, flippers spread, Tomori mouth slightly open determined, no effects. 2 CRYING COUNTER: head bowed down, BOTH long BLACK FLIPPERS covering cheeks/eyes, shoulders/body hunched, sad teary Tomori face still partly visible, upright penguin. 3 'hey?' SHOUT: upright penguin looks RIGHT wide-eyed, small open round mouth as if saying hey, flippers at sides. 4 SILLY LAUGH: eyes joyfully CLOSED in soft upward arcs, small happy open mouth, head slightly tipped, rounded penguin body with flippers on belly. Keep face gentle and recognizable, no deformed grotesque expression.

## call

输出：`tomori-penguin-call-v1.png`

帧序：call-windup, call-release, transform, hit-high

FOUR POSES: 1 call windup: rounded penguin breathes in, head slightly raised, flippers pulling back, open focused eyes. 2 GUGUGAGA CALL: head thrown slightly BACK and mouth opened in an enthusiastic cry, flippers stretched outward sideways, chest/cream belly lifted, feet planted. 3 transformation pose: body upright and flippers spread in a welcoming wide arc, Tomori face surprised but composed, NO magic/effects baked in. 4 high hit reaction: penguin head and torso pulled back, flippers splayed, startled pained face, feet unsteady.

## recovery

输出：`tomori-penguin-recovery-v1.png`

帧序：knockdown-fall, knockdown-ground, getup, victory

FOUR POSES: 1 falling-back knockdown, penguin body leaning diagonally LEFT with webbed feet in front and flippers trying to balance, startled Tomori face. 2 knocked-down penguin lying on SIDE horizontally on invisible floor, black back/cream belly, short orange feet, face turned toward viewer RIGHT, flippers folded, no human body. 3 penguin getting up from low crouch, one flipper bracing at side and orange feet tucked under belly, determined face. 4 cute restrained victory: upright penguin with a tiny relieved Tomori smile, both flippers lifted a little outward in proud pose, feet grounded.

## stances

输出：`tomori-penguin-stances-v1.png`

帧序：crouch-flipper, crouch-kick, air-flipper, air-kick

FOUR STANCE ATTACK POSES: 1 low crouching BLACK FLIPPER strike RIGHT, penguin body squatted compactly, head down yet face visible, flipper extended forward near floor. 2 low crouching orange webbed-foot sweep RIGHT, body squatted, flippers supporting balance, short feet only, no human legs. 3 airborne flipper slap RIGHT, penguin body lifted with feet tucked, one flipper extended toward opponent and other balances. 4 airborne short orange WEBBED FEET double kick RIGHT, body tilted diagonally back, both flippers spread, lively focused face. Keep same anatomy and head size.
