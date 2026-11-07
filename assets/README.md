**简体中文** | [English](README.en.md) | [日本語](README.ja.md)

# 素材目录与调用对照表

修改美术、语音、视频或其游戏内绑定时，从这里开始。源文件在本目录中；运行时清单是 `frontend/public/assets.json`。

## 目录归属

| 目录                                     | 职责                                                      |
| ---------------------------------------- | --------------------------------------------------------- |
| `characters/mygo/<character>/`           | MyGO 的源分解图、动作选配、帧映射表与打包后的源图集       |
| `characters/mygo/tomori/voices/`         | 企鹅语音片段与 `penguin-voices.json` 的时间/来源目录      |
| `characters/mygo/soyo/haruhikage/`       | 素世的大招语音、切入视频、终结画面静态图与出处            |
| `characters/mygo/jab-actions.json`       | 爱音、素世与灯共用的轻攻击连段选配                        |
| `characters/mujica/<character>/`         | 普通/舞台形态的动作图与分角色清单                         |
| `characters/mujica/mask-transformation/` | 共用的面具变身美术                                        |
| `characters/mewtype/<character>/`        | 虚拟形态的图集、动作清单与薇欧拉美术                      |
| `characters/*/portraits-v*/`             | 已审核的立绘源、脸部裁切与裁切元数据                      |
| `characters/poppinparty/`                | 离线角色草稿、立绘、关键姿势与语音；不注册为可玩角色      |
| `meme-media/<feature>/`                  | 跨角色技能录像、切入画面、提取的姿势与出处                |
| `finish-art/`                            | KO 美术与 `v2/` 奥义美术、语音/视频源与目录               |
| `stages/`                                | 背景与 `stages.json` 几何数据，含校园出处                 |
| `fonts/`                                 | 本地 UI 字体与授权；由 `frontend/src/styles.css` 直接引入 |
| `reference/`                             | 共用视觉参考与脸部修订指南                                |
| `notes/`                                 | 历史设计与实现笔记；不是运行时配置                        |

角色文件名保留各自的前缀，以便导出物仍可辨认。`riki` 是立希（Taki）的美术标识；运行时角色阵容使用 `taki`。较早的源文件修订版本予以保留，因为选定的姿势与审核过的比例仍可能依赖它们。

## 素材如何进入游戏

```text
assets/ source files + selection/provenance catalogs
  -> tools/build.py and specialized packers
  -> frontend/public/assets.json: semantic keys -> /media/<content hash>.<ext>
  -> frontend/src/assets/loadAssets.ts: resolve deployment base + hydrate band forms
  -> frontend/src/assets/bandArt.ts and GamePage runtime/components
```

清单是运行时绑定的权威来源。游戏代码选取 `penguinVoices.penguinKick` 这类语义条目，绝不使用手写的内容哈希或指向本源目录的路径。字体是直接 CSS 引入的例外。共享战斗内核与 Scala 后端不读取源美术；`tools/build.py` 还会把关卡地形目录导出到 `scripts/stages.json`。

| 素材组              | `tools/` 下的打包入口                                                                                | 运行时清单键                                                                                                                                                          | `frontend/src/` 下的游戏消费方                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MyGO 动作图         | `build.py`；源图集更新：`build_riki_assets.py`、`build_rana_assets.py`                               | `characters`, `anonNormals`, `anonActions`, `soyoActions`, `tomoriActions`, `penguin`, `jabActions`, `milkDragon`, `soyoTensora`, `ranaParfaitActions`, `ranaParfait` | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/`                                                                                                  |
| Mujica/MewType 动作 | `build_mujica_assets.py`、`build_mewtype_assets.py`、`build_viola_assets.py`、`build_mask_assets.py` | `mujicaForms`, `mewtypeForms`, `mujicaMaskForms`                                                                                                                      | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/battleScene/`                                                                                      |
| 立绘与脸部裁切      | `build_mygo_portraits.py`、`build_portrait_assets.py`、`build_mewtype_portraits.py`                  | `mygoPortraits`, `mujicaPortraits`, `mewtypePortraits`, `characters.*.portrait`                                                                                       | `assets/bandArt.ts`, `pages/GamePage/components/CharacterPortraitPreview.tsx`, `pages/GamePage/runtime/rendering/drawEntrances.ts`                        |
| 技能录像与切入画面  | `build_meme_assets.py`；企鹅与春日影另由 `build.py` 接入                                             | `memeSkills`, `memeVoices`, `penguinVoices`, `soyoVoices`, `summonVoices`, `transformMusic`, `memeCrawlForms`, `sakikoCustomerActions`, `soyoSuperVideo`              | `pages/GamePage/runtime/audio/AudioDirector.ts`, `pages/GamePage/runtime/rendering/`, `pages/GamePage/components/BattlePanel/UltimateBackgroundVideo.tsx` |
| 终结画面演出        | `build_finish_assets.py`、`build_finish_videos.py`                                                   | `finishArts`, `ultimateFinishes`, `finishVoices`, `soyoFinishArt`, `uikaFinishArt`                                                                                    | `pages/GamePage/components/BattlePanel/FinishOverlay.tsx`, `pages/GamePage/runtime/audio/AudioDirector.ts`                                                |
| 关卡背景与几何      | 经由 `build.py` 调用 `build_stage_assets.py`                                                         | `backgrounds`, `stages`                                                                                                                                               | `pages/GamePage/runtime/rendering/createStageRenderer.ts`、角色选择                                                                                       |

## 查找文件或绑定

在仓库根目录执行：

```sh
npm run assets:find -- penguin
npm run assets:find -- mujicaForms.6
npm run assets:find -- ultimateFinishes
```

该命令搜索源文件名与运行时清单路径，并为每个匹配的绑定打印实际部署的媒体文件名。它也接受媒体哈希。各条结果是彼此独立的搜索，并不表示源文件与裁切或打包后的导出物逐字节相同。清单中的数字键是从 0 开始的角色阵容 ID；身份信息用 `frontend/src/game/data/roster.ts`，乐队与形态选择用 `assets/bandArt.ts`。

## 路径规则与更新素材

- 动作目录的 `file`、`overrides` 与 `sourceFiles` 条目相对于 `assets/`：例如 `characters/mygo/anon/anon-extra-mobility-v1.png`。
- 关卡 `file` 条目相对于仓库根：`assets/stages/...`。
- 录像目录沿用各自文档化的仓库相对或目录相对约定。修改这些路径前，先确认所属打包器的解析逻辑。
- 运行时 `/media/` URL 相对于部署应用的基础路径；`loadAssets.ts` 处理项目子路径。
- MewType 清单中的 `review.proof` 条目是相对 `assets/` 指向 `../output/artwork/` 的路径。可选的审核文件、拼版图与截图都放在忽略的 `output/` 下。

修改源文件后，必要时先运行对应的源打包器，再运行 `python3 tools/build.py` 导出。针对性的立绘/终结画面脚本可以直接更新现有清单；见[美术工作流程](../docs/ARTWORK.md)。普通的应用构建不会重新打包美术，也不需要 Python 依赖。

修改绑定后，运行 `npm run check` 与 `npm run build`。素材检查会校验运行时内容哈希、跨乐队的源动作分组、企鹅语音路径与关卡源。移动源文件时保留出处与原始媒体；目录路径、打包器、草稿引用与本调用对照表要一起更新。
