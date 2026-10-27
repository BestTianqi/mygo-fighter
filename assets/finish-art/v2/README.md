# 大招终结场景图 v2

在原立绘基础上使用内置 image_gen 编辑生成，保留脸型、发型发色、眼睛、服装与角色比例，扩充为有环境景深和统一光照的横版 2D 场景。不是角色动作贴图，不替换普通击杀使用的原奥义图。

- 21 张独立横图覆盖 16 人、22 种战斗形态；灯常态和企鹅形态共享凑企鹅图。
- 爱音保留黄色奶龙；灯保留企鹅。Mujica 五人各有常态服装和演出服两张图。
- 人物位于左侧，右侧留出文字区；右方获胜时由游戏镜像整幅场景，文字始终正向显示。
- 原始生成图为 PNG，运行时按最长 1600×900 导出 WebP；仅按当前所选队伍预载。
- 原立绘、旧奥义图、战斗动作、大招视频与大招语音均保留。普通击杀使用原结算图。

各组完整提示词与参考图路径见 `mygo-prompts.json`、`mujica-prompts.json`、`nyamu-prompts.json`、`mewtype-prompts.json`。生成模式均为内置 image_gen edit，逐图查看验收。

新终结语音各角色一条，来自网络上的原动画本人台词；来源、裁切时间、说话人和核对依据见 [sources-voices.json](sources-voices.json)，说明见 [voices/README.md](voices/README.md)。Mujica 双形态和灯企鹅形态共享各自的本人终结台词。语音保持原速，与已有技能片段不同；若完整大招台词尚在播放，终结台词排队衔接，避免重叠或截断。

运行 `python tools/build_finish_assets.py` 更新运行资源。`ultimateFinishes[character][form]` 配置场景图、终结语音键、中文台词、静音背景视频及播放时长；`finishVoices` 保存终结音轨。[背景视频说明](videos/README.md) 与 [原片记录](sources-videos.json) 对应同一句台词。奥义图保留到原大招语音及终结语音完整播放后再退场；联机双方均完成后一起进入下一战，战斗伤害判定不变。
