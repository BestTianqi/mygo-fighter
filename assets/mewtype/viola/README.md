# 薇欧拉／Viola（id 15）

《BanG Dream! YUME∞MITA》薇欧拉的首版正常身材 2D 格斗素材。使用内置 **imagegen** 绘制；透明原图留在本目录，打包仅裁取完整连通人物、按统一世界高度缩小并建立脚底锚点，不拼接肢体或拉伸姿势。

## 官方形象参考

- [梦限大MewType 官方《角色CM：薇欧拉》](https://www.bilibili.com/video/BV11uK36xEs2/)，31 秒，cid `39994722827`。
- 4 秒的资料卡提供完整服装，8 秒及20秒提供面部；原片与核对联系图缓存在 `output/viola-art/`。
- 深森林绿长发、左侧单丸子与姬发，右侧黑色交叉夹、左侧银白三角夹及横夹；金绿色眼睛，嘴右下方小痣。炭灰褐校服、奶油色矩形胸片及花形徽章、灰紫细褶立领、金色滚边与四颗腰扣、短褶裙、黑短袜及橄榄色乐福鞋。
- 采用动画校服造型；代码中的 `virtual` 是现有角色素材分组键，不表示新增了虚拟演出服。

## 实际画作和打包

| 文件 | 内容 |
| --- | --- |
| `portrait-source-v1.png` | 1024×1536 透明全身立绘，同时作为 idle 原画 |
| `actions-locomotion-source-v1.png` | 1536×1024，4×2 共8幅：两帧走路、冲刺、站防、蹲防、跳跃、受击、倒地 |
| `actions-combat-source-v2.png` | 1536×1024，4×2 共8幅：J1掌击、J2横扫、J3上勾、K侧踢、U手机拍摄、I蹲身剪辑、O前推、P举手机放送 |
| `actions-combat-source-v1.png` | 方向纠正前的原稿档案，不被运行时使用 |
| `manifest.json` | 17幅真实画作来源、SHA-256、规范帧名别名和参考资料 |
| `virtual-runtime.webp` / `virtual-frames.json` | 17幅完整画作的运行图集及命名帧 |
| `portrait.webp` / `face.webp` / `idle-runtime.webp` | 选人立绘、正方形面部、单独待机图 |
| `proof.png` | 17幅独立画作的核对联系图 |

J三段、重击和U/I/O/P均使用不同原画。起手、收招、低位和空中等过渡帧以 `manifest.json` 中的显式别名复用这些完整画作；没有把别名计为新画作。人物所有主体均有真实透明边距、双鞋完整，动作通过整幅图集帧切换。

重建：`python tools/build_viola_assets.py`。完整游戏构建在输出前调用 `install_viola_assets(assets)`，只安装 `characters[15]`、`mewtypeForms['15']` 与 `mewtypePortraits['15']`，不覆盖旧角色；奥义图由原有 finish 素材构建器安装。

## 绘图提示词组

以下为本次内置 imagegen 使用的生产约束与最终提示词要点，便于后续保持一致：

1. **全身立绘**：`Production full-body portrait and idle sprite of Viola / ビオラ from BanG Dream! YUME∞MITA, matching the official profile and close-up references. Normal seven-head-tall anatomy, slim human proportions, not chibi. Preserve dark forest-green waist-length hair, single left bun, hime-cut bangs, black crossed right clips and silver triangular/bar left clips, olive-gold eyes and tiny right beauty mark. Exact charcoal/ivory/lavender/gold school outfit, pleated skirt, black ankle socks, olive loafers. Composed sly smile, small dark smartphone, complete head/hair/hands/shoes. Clean cel-shaded anime line art, consistent subdued palette. Centered isolated whole figure, genuine transparent background, no text, instruments, floor, shadow or glow.`
2. **移动防御图**：`Eight independent complete full-body poses of the same reference Viola, 4 columns × 2 rows, transparent gutters, facing screen right. Top: walking contact, walking passing, forward dash, standing guard. Bottom: crouching guard, rising jump, recoiling hit reaction, side-lying knockout. Normal anatomy, consistent face/outfit and palette, no cropped body, no labels or shared effects.`
3. **攻击图**：`Eight different complete attack poses, same exact character, outfit and normal proportions, 4 × 2 transparent grid. Top: short open-palm first jab, twisting horizontal backhand second jab, rising elbow third finisher, forward side kick heavy. Bottom: eye-level smartphone recording U, crouching smartphone edit I, long lunging dismissal palm O, raised-smartphone commanding P. All target screen right, fully visible hair/hands/shoes, no extra instruments, glow, text or background.`
4. **方向纠正**：`Precise sprite sheet correction: redraw only row1/column1 and row2/column1 toward screen right, with back/hair at left and forward palm or phone at right. Preserve six other figures, cell layout, character identity, colors, full bodies and real alpha background. Keep the rejected v1 as archive; install corrected v2.`

技能道具与施放姿势为格斗游戏改编，不作为动画中角色拥有超能力的设定。
