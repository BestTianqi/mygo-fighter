**简体中文** | [English](ARTWORK.en.md) | [日本語](ARTWORK.ja.md)

# 美术工作流

`frontend/public/assets.json` 是运行时清单。其中的 `/media/...` 引用指向 `frontend/public/media/` 下按内容寻址的文件。这些文件由服务器直接提供，应用代码不内嵌 base64 媒体。

原始画稿、源分解图、元数据与署名保留在 `assets/` 下。部分历史出处笔记会提到旧的生成预览和截图路径；这些引用描述的是早先的美术流程，当前应用与检查以根 README 为准。

目录归属与路径约定见[素材源目录](../assets/README.md)。MyGO 的动作分解图与元数据位于 `assets/characters/mygo/<character>/`；关卡几何与其背景一起位于 `assets/stages/stages.json`。历史设计笔记收集在 `assets/notes/` 下。

日常应用开发只需 `npm ci` 与 `npm run build`，不需要 Python 或图像处理包。

修改源分解图后要重新生成运行时美术，请执行：

```sh
python3 -m pip install -r requirements.txt
python3 tools/build.py
npm run build
```

可选的 Python 流程负责裁切、锚定与打包源美术，然后写入媒体文件、清单与服务端地形目录。角色打包器生成图集与帧映射表；旧的 HTML 预览步骤因模板已不存在而被移除。

生成的审核联络表与部分打包产物放在被忽略的 `output/artwork/` 目录，镜像源端的团体/角色文件夹结构。它们不是应用或完整美术构建的输入。完整的源分解图、最终图集、帧映射表与署名留在 `assets/` 下；下载的参考页 HTML、JavaScript 与 CSS 缓存则不保留。MewType 清单中的 `review.proof` 路径相对于 `assets/`，指向 `../output/artwork/`；需要时用对应角色的打包器重新生成。

`python tools/build_riki_assets.py` 在立希的动作源变化时，于完整导出前重建她选中的图集与帧映射表。`python tools/build_rana_assets.py` 打包乐奈选中的姿势。`python tools/build_mujica_assets.py --character umiri --form normal` 与 `python tools/build_mewtype_assets.py --character arale` 打包单个形态。这些命令只更新源图集；执行 `python tools/build.py` 才会把它们导出到运行时清单。

运行 `node scripts/check-assets.mjs`，可在不重新生成美术的情况下检查内容哈希、清单引用与 MyGO/关卡源路径。移动源文件时还需同步更新其动作目录与打包器路径；运行时 `/media/` 名称取决于内容而非源位置。

## MyGO 立绘更新

五张已审核的正常身材 MyGO 画稿位于 `assets/characters/mygo/portraits-v1/`。每张透明 `*-source-v1.png` 提供全身立绘、方形脸部裁切与落地待机帧，与 Mujica 立绘流程一致。`crops.json` 记录审核过的脸部取景（相对于紧裁后的人物）。现有的攻击、移动与变身分解图各自独立保留。

更新这些源文件后，只需重新生成 MyGO 立绘：

```sh
python tools/build_mygo_portraits.py
node scripts/check-assets.mjs
```

导出器保留所有已引用的运行时文件，加入按内容寻址的立绘文件，只淘汰清单已不再引用的生成媒体。常规的完整美术构建也会包含这些立绘。菜单、选人预览与普通终结画面使用角色立绘；选人卡与 HUD 使用显式的脸部裁切。素世与初华的视频终结静帧保持原样。

MewType 在 `assets/characters/mewtype/portraits-v1/` 下采用相同流程，使用各角色最初的虚拟装束。运行 `python tools/build_mewtype_portraits.py` 可更新这五张立绘、方形脸部裁切与待机图集。现有的移动与攻击分解图仍是独立制作的素材。
