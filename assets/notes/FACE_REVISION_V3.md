# 面部修订 v3 · 官方 2D 面部基准与分组动作

2026-10-17。用户认为前两次面部仍不够像，并明确选择以「官方立绘里的 2D 脸」为准。

使用内置 `image_gen`。先仅从两张官方立绘生成 `faces-v3-guide.png`，包含每人近正面和轻微右转的头部基准；再以面部基准、对应官方立绘和旧动作姿态作为三张参考图，分别生成每张仅 4 个完整人物的 2×2 动作源图，给眼部与脸型更多像素。

源图：`anon-actions-v3-1.png` 至 `anon-actions-v3-4.png`、`soyo-actions-v3-1.png` 至 `soyo-actions-v3-4.png`。

打包图：`anon-normal-actions-v3.png`、`soyo-normal-actions-v3.png`；`*-runtime.webp` 与 `*-idle.png` 同步更新，人物以无损 WebP 内嵌至 `index.html`。

构建时沿用 v2 每个姿势相对待机的高度比例，统一四张源图的显示尺寸，避免不同动作之间人物忽大忽小；游戏规则、角色比例和操作不变。v1/v2 原图均保留。

## 面部基准提示词

Use case: identity-preserve. Asset: high-resolution facial model sheet used to correct two characters in a 2D fighting game. The user has REJECTED generic anime faces. Input1 is the OFFICIAL Chihaya Anon 2D illustration; input2 is the OFFICIAL Nagasaki Soyo 2D illustration. These exact drawings are the sole authority. Create a transparent image containing exactly FOUR LARGE HEAD-AND-NECK portraits in a 2x2 layout: TOP LEFT Anon facing almost front like input1; TOP RIGHT the same Anon at a mild right-facing three-quarter angle; BOTTOM LEFT Soyo almost front like input2; BOTTOM RIGHT same Soyo at a mild right-facing three-quarter angle. All four heads complete with hair crown, ears if visible, chin, neck and just the top of school collar; crop long hair gracefully at shoulders, no full bodies. Each head takes about 40% of total canvas width. PRIORITY EXACT OFFICIAL FACE LIKENESS. Reproduce the actual reference facial design rather than a style-inspired redesign. Preserve the broad rounded eye shapes, iris size, eye spacing, eyelid and eyelash shapes, brow position, short rounded cheeks and short lower face, tiny simple nose, reference fringe parting and fine line placement. ANON: original large open rounded slate-blue-gray eyes, light pink hair with the precise diagonal overlapping forelock and original bangs, youthful broad cheek/short chin, energetic slightly smiling mouth. SOYO: original large softly downturned pale blue-gray eyes, thinner calm arching eyelids, original light ash-brown side-parted forelock sweeping across the forehead, gentle calm reserved small closed-mouth smile, soft oval cheeks and short chin. Soyo is not narrowed, elongated, sharply V-chinned, cat-eyed, or half-lidded. No green or teal recolored eyes. Both faces should have the full round eyes and gentle face proportions visible in the OFFICIAL references. Use the same exact flat official 2D character-design illustration look: uniform thin muted outlines, minimal cel shadow, pale skin, reference-like muted gray-blue irises with small reference-like highlights. Do not add glossy gacha shading, heavy black eyeliner, rendered skin, painterly texture, 3D, generic modern anime pointed faces, extra hair details or hyper-detailed eye glitter. Adult normal anime head proportions, not chibi. Across two views each character must be the same character. No labels, no words, no grid, no background, actual RGBA transparency. It should look like an official model-sheet face enlarged from input1/input2, with only the necessary angle adaptation.

## 动作图提示词

### anon / 第 1 组



### anon / 第 2 组



### anon / 第 3 组



### anon / 第 4 组



### soyo / 第 1 组



### soyo / 第 2 组



### soyo / 第 3 组



### soyo / 第 4 组
