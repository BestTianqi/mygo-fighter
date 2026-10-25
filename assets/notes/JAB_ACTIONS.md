# 普攻三连段动作差异化

2026-10-19。保留现有普攻节奏、取消窗口、伤害、击退和第三段挑空规则，替换第二、第三段的视觉动作。爱音、素世、灯各新增六张完整人物图，分别对应二段和三段的准备、命中姿势、收招，共18张。

| 角色 | 第一段 | 第二段 | 第三段 |
| --- | --- | --- | --- |
| 千早爱音 | 直拳 | 侧踢 | 上勾拳 |
| 长崎素世 | 轻掌 | 横掌 | 双掌上挑 |
| 高松灯 | 轻拳 | 贴身肘击 | 麦克风上挑 |
| 要乐奈 | 探掌 | 琴身撞击 | 琴锋上挑 |
| 凑企鹅 | 鳍拍 | 蹬脚 | 企鹅顶撞 |

乐奈、凑企鹅从已有动作库选择不同的准备、出手、收招序列；后段不再退回每段相同的通用起手。爱音与企鹅二段的接触特效高度同步按脚部攻击计算。第一段和其他普通拳脚保留现有资源。

## 新素材与来源

使用内置 **imagegen** 生成，真实透明背景，正常身材比例，以现有角色图作身份、面部和服装配色参考。未调用外部图像 API。原图在生成目录保留，项目中使用以下副本：

- `assets/mygo/anon/anon-jab-chain-v1.png`：参考 `anon-idle.png`、`anon-normals-standing-v3.png`。
- `assets/mygo/soyo/soyo-jab-chain-v1.png`：参考 `soyo-extra-combat-v1.png`。
- `assets/mygo/tomori/tomori-jab-chain-v1.png`：参考 `tomori-combat-v1.png`。
- `assets/mygo/jab-actions.json`：角色索引与姿态高度。每张均为2列3行，按行读取：二段准备、二段命中、二段收招、三段准备、三段命中、三段收招。

共同提示词：

> Use case: stylized-concept. Produce a NEW six-frame fighting game sprite sheet using reference images for the approved exact character identity, 2D facial style, costume, neutral lighting and color palette. NORMAL full-size teen body proportions, NOT chibi. Clean anime lines/cel shading. EXACT 2 columns by 3 rows, six SEPARATED full-body figures read row-major. All face SCREEN RIGHT in three-quarter fighting view. Same natural body scale across cells, complete hair/head/hands/shoes, generous transparent gutters, no cropping. Each pose must have a distinct silhouette. Actual transparent alpha background. No text, labels, borders, grid lines, floor, cast shadows, backgrounds, effects, motion trails, music notes or extra props. Keep face and costume colors identical to the references; do not change existing character design.

各角色动作要求：

- 爱音：二段抬右膝蓄势→向右水平侧踢→收腿；三段沉身蓄右拳→向右上方上勾拳，拳高过头→降拳回架。保持长粉发、灰色西装、绿色领带及格裙、深绿长袜和黑鞋。
- 素世：二段转肩蓄单掌→向右横向扫掌→收肘；三段低姿双掌蓄于腰间→双掌向右上方挑出→降掌回架。保持浅棕长发、蓝眼、海军蓝水手服及白条纹、灰领结、蓝袜和棕鞋。不使用施法或招手动作。
- 灯：二段收空手肘→向右横肘→收肘回身；三段沉身将麦克风手降至髋侧→握麦克风向右上方挥出→收回胸前。保持灰紫短发、棕眼、灰西装和绿色领带、格裙、绿袜黑鞋，不使用唱歌姿势。

## 运行与验收

`tools/build.py` 将新图提取为透明人物、校准脚底锚点，按现有尺寸规则生成 `anon-jab-runtime.webp`、`soyo-jab-runtime.webp`、`tomori-jab-runtime.webp`，并内嵌进离线 HTML。画布首次使用前预解码并预热新图集。

`src/animation.js` 按三段各自时间选择姿态；`src/app.js` 从对应图集绘制，受击、倒地和暂停仍沿用原有优先级。

检查：`node --test tests/jab-animation.test.cjs`、`python tests/jab_animation_browser.py`。浏览器验收覆盖真实 J 连按、五套普攻外形、新18张绘制、2P镜像、触屏长按、暂停与打断，输出到 `tests/artifacts`。
