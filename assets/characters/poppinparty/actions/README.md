# Poppin'Party 动作图

五人各16种关键姿势，共80种：待机、行走、奔跑、跳跃、防御、受击、倒地、入场、J第一／第二／第三段、K、U/I/O/P。均使用内置 image_gen 基于各自已批准立绘生成，正常比例、统一花咲川校服；完整绘图记录见上一级 `action-prompts.json` 和 `action-generation.json`。

五张同名PNG保存原始动作图集。另有五张单姿势补图，替换图集中边界不足的有咲入场、香澄U/I、多惠跳跃、里美K；原图集其余姿势继续使用。

`manifest.json` 逐角色列出每个动作的源PNG、取图矩形、轮廓、显示比例和必要镜像。不能按等宽网格直接裁切：个别乐器或鞋尖越过了生成图的名义格线，轮廓能在保留完整人物时排除相邻姿势。香澄U按动作朝向镜像显示，里美U保留独立抛出的巧克力螺旋面包。

源PNG不改写像素。运行 `python tools/build_poppinparty_actions.py` 只分析透明通道、生成取图与轮廓资料，需要 Pillow、NumPy、OpenCV。再运行 `node tools/build_poppinparty_drafts.mjs` 更新预览和角色资料。

`preview.js` 用Canvas显示这些动作。上一级 `preview.html` 可以逐个选择动作、播放J三段，并让U/I/O/P与入场使用对应语音。动作回到待机后语音仍按原速播放完毕。

这是关键姿势素材包及动作切换示意，未制作每招的完整连续逐帧动画。正式名单、CPU、联机、运行时资源包均未导入该素材包。
