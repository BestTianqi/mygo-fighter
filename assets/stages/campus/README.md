# 校园与 MyGO 场景素材

新增九张地图，沿用现有六张，共十五张。所有新背景来自网上可访问的《BanG Dream! Girls Band Party!》背景素材，保留原始 PNG；运行时按各自焦点裁为 16:9，压缩为 WebP 并嵌入离线 HTML。未用相似学校照片替代原场景。

| 地图 | 原背景编号 | 地形 |
| --- | --- | --- |
| 花咲川女子学园 | bg00003 | 花坛低台、中央高廊、两侧迂回平台 |
| 羽丘女子学园 | bg00010 | 多级连台、上层连廊 |
| 月之森女子学园 | bg00470 | 钟门广场、石柱高台 |
| 月之森·庭院 | bg00473 | 花圃、回廊、中央高台 |
| 羽丘·学校天台 | bg00012 | 设备台、围栏平台 |
| CiRCLE·练习室 | bg00033 | 音箱低台、木制高台 |
| RiNG·练习室 | bg00918 | 鼓台、音箱、上层走台 |
| 大台阶·黄昏 | bg01007 | 实际可行走的连续台阶、休憩平台 |
| 大台阶·夜景 | bg01008 | 不同高度的阶梯、侧翼迂回平台 |

所有背景均为原游戏美术，权利属于原权利人；不是本项目原创或 CC 授权素材。原始地址、下载日期、尺寸、SHA-256 见 [sources.json](sources.json)。

场景核对：

- [背景图库分类](https://bandori.fandom.com/wiki/Girls_Band_Party%21_Background_Images)：花咲川校门、羽丘校门/天台、CiRCLE 练习室。
- [Morfonica 第一话剧情数据](https://bestdori.com/assets/jp/scenario/band/021_rip/Scenarioband6-001.asset)：月之森场景，`bg00473` 对应「月ノ森女子学園 庭園」。
- [MyGO 第七话剧情数据](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-007.asset)：`bg00010` 对应「羽丘女子学園 校門前」。
- [MyGO 第八话剧情数据](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-008.asset)：`bg01007` 对应「大階段」；`bg01008` 是同场景夜景图。
- [MyGO 第十六话剧情数据](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-016.asset)：`bg00918` 对应「RiNG スタジオ」。

地形是为本游戏独立设计的可玩布局。可落脚线与碰撞高度一致，支持跳上平台、↓＋跳跃穿台下落、坡面与阶梯行走。低地、高台和镜头均使用现有战斗规则；每张新地图的最高层均通过 CPU 实际攀登测试。
