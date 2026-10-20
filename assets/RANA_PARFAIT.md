# 要乐奈 · 抹茶芭菲远程攻击

已接入游戏。V / 2P End，消耗25共鸣，地面发动，220毫秒释放一杯抹茶芭菲；700毫秒动作结束。基础伤害18、格挡磨血2。杯子沿抛物线飞行，水平速度550、初始向上速度170、重力420、最长1.8秒；命中一次后消失。支持正反朝向、地形、飞行物抵消、钢板、防御与暂停/重开。命中、格挡、钢板拦截、对消或落地时出现配料溅射，不追加范围伤害。电脑可在远距离使用；手机显示“抹茶芭菲”按钮。

新增四帧：parfait-ready、parfait-windup、parfait-release、parfait-recover。原有48基础动作继续保留，总计52帧。四帧独立使用 rana-parfait-actions-runtime.webp 图集。

## 网上素材来源

检索日期：2026-10-19。通过网页搜索检索 MyGO / 要楽奈 / 抹茶パフェ，并阅读下列来源。agent-reach 体检确认 Exa 不可用，Jina Reader 请求失败后使用可用网页搜索与阅读工具；原始图片使用系统网页下载保存。

- 来源文章（明确说明页首图片引用自 MyGO 第4话）：https://note.com/cemetrygates1919/n/n30bf9049a5f4
- 原图：https://assets.st-note.com/production/uploads/images/116016302/rectangle_large_type_2_217f136de0e16b4b2b02e14bad268b00.jpeg?width=1280
- 项目保存：reference/rana-parfait-anime-web-v1.jpg（1280×670）。图片本身标有 ©BanG Dream! Project。

依据该动画画面中的抹茶软冰淇淋、草莓、香蕉、巧克力片和分层玻璃杯设计游戏飞行物。参考图下方杯脚被裁切，因此通过内置 imagegen 补全杯底并生成透明道具；这是基于网上动画参考重绘的游戏素材，不是把原截图直接裁作透明图。游戏内完整离线嵌入，不从网上热链加载。

生成模式：内置 imagegen。透明道具为 rana-matcha-parfait-v1.png；四帧投掷原稿为 rana-parfait-throw-v1.png，最终采用v2，修复前两帧虹膜颜色，统一为金蓝异色瞳。v1保留对照。人物参考依次采用当前已批准的 rana-presence-v1.png 和 reference/rana-official.png；不改变正常身体比例、黑白舞台服和酒红吉他。

打包仅进行透明连通区域提取、缩放与无损WebP保存，沿用现有工具。投掷素材四个人物没有相接，杯子与鞋尖不触外边缘。原有 rana-preview.html 查看48基础动作，新增动作可在游戏V技能中查看。

## 透明芭菲提示词

Use case: background-extraction / precise-object-edit. Reference 1 is a web-sourced still from episode 4 of BanG Dream It's MyGO, showing Kaname Rana eating her matcha parfait. Extract and carefully reconstruct ONLY THE PARFAIT as one standalone transparent game projectile sprite. Preserve the recognizable design from this exact dessert: tall green matcha soft-serve swirl with layered dark-green/bright-green spiral ridges; several vivid red strawberry halves at base of swirl; yellow banana slices against inside of clear glass; narrow brown chocolate wafer on right side; golden cream and dark brown layered fillings; clear gently tapered stemmed dessert glass. The reference crops off the very bottom: complete only this missing glass bottom with a short elegant clear stem and round glass foot, no new toppings. Maintain clean 2D anime cel shading and crisp readable silhouette. Neutralize café yellow lighting slightly for game use while keeping green, red, yellow, brown food colors. ONE complete upright cup, 3/4 front view, centered portrait framing with at least 12% transparent margin around all tips and base. Keep food opaque while outer glass has subtle transparent edges and highlights. Genuine transparent RGBA background. NO human, hands, guitar, spoon, table, background, shadow, glow, text, captions, watermark or frame. This is an isolated edible prop, not a character.

## 四帧人物动作提示词

Use case: illustration-story. Production asset for existing 2D fighting game: Kaname Rana throwing her matcha parfait. EXACTLY FOUR separate full-body figures in an invisible 2x2 grid, generous clear transparent gaps and 48px safety margins inside all four quadrants. NORMAL slim anime teen proportions, not chibi. Reference 1 is approved Rana sprite sheet: lock silver bob, delicate official 2D face, heterochromia (anatomical right gold and left pale blue), charcoal off-shoulder distressed-hem oversized tunic over white long-sleeved underlayer and white hem, bare legs, black lace-up boots with yellow sole stitches. Keep EXACT face, body proportions and palette throughout, no costume changes or colored combat lighting. SAME wine-red electric guitar with ivory pickguard remains attached to shoulder by black strap and steadied near waist by non-throwing hand, no extra guitar, no third arm. Reference 2 supplies official facial detail. Reference 3 supplies the real MyGO anime parfait design: green matcha soft-serve swirl, red strawberry halves, yellow banana slices, brown chocolate wafer, layered cream/chocolate in a tall clear glass.
All FOUR face/look RIGHT in 3/4 view, whole head, both boots, guitar and held cup fully visible, separate complete silhouettes.
TOP LEFT: preparation ready, grounded stance, RIGHT throwing hand holds upright parfait cup close in front of upper chest, left hand steadies strapped guitar at waist, quietly intent gaze.
TOP RIGHT: throwing windup, right elbow bends and carries upright cup beside RIGHT shoulder drawn back toward image-left, torso rotates ready to toss toward RIGHT, left hand still at guitar.
BOTTOM LEFT: throw RELEASE follow-through, right arm extends forward RIGHT at shoulder height, OPEN EMPTY hand with natural fingers, slight forward step, weight on leading boot; NO cup in this cell because it has just been launched, guitar still strapped and other hand steadying.
BOTTOM RIGHT: recovery, throwing arm retracts toward chest with empty open hand and elbow bent, feet return toward idle, guitar settled, calm attentive eyes RIGHT; NO cup here.
True transparent RGBA, no background, floor, shadows, glow, effects, text, labels, separate portraits or additional objects. Fit every figure entirely within its own quadrant, shorten arm extension or make figures slightly smaller as needed, no touching silhouettes.

## 面部修订提示词

Edit ONLY the iris colors in reference 1, the four-pose Rana parfait throw sheet. The TOP-LEFT and TOP-RIGHT faces incorrectly have two blue eyes. In BOTH TOP figures change the NEAR large iris on IMAGE-LEFT side of that face to warm GOLD/AMBER, matching the BOTTOM-LEFT and BOTTOM-RIGHT faces which already have correct heterochromia. Keep the farther small eye on image-right PALE BLUE. Reference 2 is the official face showing left-of-image golden and right-of-image blue. Preserve ALL other pixels/designs as closely as possible: four complete poses, silver bob, exact face shapes, black-white outfit, boots, guitar, parfait cup only in top two, empty release hand in bottom two, body scale, transparent gaps and layout. Genuine transparent RGBA. No new backgrounds, glows, effects, labels, cropping or extra figures.
