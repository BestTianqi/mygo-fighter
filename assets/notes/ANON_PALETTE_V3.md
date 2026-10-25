# 爱音普通形态统一配色 v3

日期：2026-10-18。

用户要求：确保正常状态爱音的立绘色调一致。

采用内置 ImageGen 编辑三张既有拳脚图集，以 `anon-idle.png`（来源 `anon-actions-v3-1.png` 第一帧）为唯一配色参考。保留正常人物比例、既有官方2D面部方向、六种动作的顺序与完整轮廓，统一粉发、肤色、灰紫制服、暗绿格裙、灰绿长袜和鞋子。原v1/v2源稿保留。

当前采用：
- `anon-normals-standing-v3.png`
- `anon-normals-crouch-v3.png`
- `anon-normals-air-v3.png`

基础16帧沿用原有 `anon-actions-v3-1.png` 至 `anon-actions-v3-4.png`，没有改换面部基准；角色预览直接取同一待机帧。黄色奶龙变身图集保持黄色皮肤。

构建时仅做连通区域提取、尺寸/锚点对齐和无损WebP打包，不另行给站立/蹲下/空中动作套不同颜色滤镜。对照图 `../tests/artifacts/anon-palette-proof.png` 使用实际嵌入游戏的34个普通形态帧，在同一中性背景、无舞台灯光与必杀光效条件下渲染；三种拳脚分别与同一待机图并排对照。

## 编辑提示词（3张图共用）

Use case: identity-preserve, COLOR MATCH ONLY edit for an existing 2D game sprite sheet. IMAGE 1 is the EDIT TARGET: six complete Chihaya Anon combat figures in TWO COLUMNS by THREE ROWS. IMAGE 2 is the SOLE COLOR AUTHORITY: the game's approved idle figure. Make all six figures in IMAGE1 have the exact same gentle muted color palette and tonal contrast as IMAGE2. Preserve IMAGE1's SIX different exact poses, expressions, anatomy, proportions, fine linework, clothing patterns, face shapes, eyelash/iris shapes, hair silhouettes, placement, all hands and all feet. Do not copy the idle pose into any panel. Do not redesign or redraw the character; only color-grade the existing material fills and their shadows. Match the light soft dusty pink hair (less saturated, less hot/neon pink), pale peach/cream skin and restrained soft pink skin shadows, light muted lavender-gray blazer with white piping and subdued gray-violet shadows, muted dark olive-green skirt with dull khaki-gold plaid and matching olive tie, muted charcoal gray-teal socks and charcoal-black shoes, desaturated slate blue-gray eyes. The six figures should look colored by exactly the same person using the same paint swatches as IMAGE2, under identical neutral lighting. Avoid the target's current extra saturation, bright cyan eyes, strong rosy/red skin shadows and highly saturated green skirt. Keep natural cel shadows and details, but match IMAGE2's softer contrast. EXACT same two-column three-row layout, same tall 2:3 canvas and complete unclipped figures with separated margins. Preserve exact attacks, facial identity and detail. Genuine transparent RGBA background, including spaces between limbs and hair. No background RGB gradient, no pink clouds, no floor, no cast shadows, no rim light, no extra objects, no color swatch panels, no text or labels. Deliver the complete six-pose sheet, not a preview comparison.
