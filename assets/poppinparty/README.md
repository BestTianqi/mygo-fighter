# Poppin'Party 待接入素材包

五位成员的独立立绘与技能定义，**暂不加入游戏**。

- `portraits/`：五张1024×1536透明PNG，原作2D面部、正常身材、花咲川校服；香澄红色星形吉他、多惠蓝色吉他、里美粉色贝斯、沙绫双鼓棒、有咲按键手势。
- `references/official-uniform-lineup.jpg`：[官方校服视觉新闻](https://gamebiz.jp/news/366083)的参考图片。人物从左到右为里美、沙绫、香澄、有咲、多惠。
- `prompts.json`：内置 image_gen 的原始提示词、参考来源和生成模式。
- `skills.json`：55个招式加1个内部反击波，包含效果、判定、时间、伤害和动作说明；不包含正式数字ID。
- `preview.html`：双击可查看五张立绘和技能表；不依赖服务器，不载入正式游戏。

技能代码：`frontend/src/game/bands/poppinparty/draftMoves.ts`。工厂接受将来正式分配的五个ID，仅返回数据，没有自动注册副作用；未被 `bands/index.ts` 导入。不要直接把导出器使用的临时ID当作正式ID。

重新导出：在项目根目录运行 `node tools/build_poppinparty_drafts.mjs`。此操作更新五份角色JSON及离线预览，不更新正式资源清单。

技能以共享战斗内核验证：双方方向共110次释放，包含能量不足、基础连击衰减、反击及落空波、护盾及到期、预警躲避、前后方向和大招霸体。没有修改共享内核。头像裁切、逐帧动作、特效渲染、原声与奥义背景图需在后续接入任务完成，不宣称当前已可玩。
