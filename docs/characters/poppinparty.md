# Poppin'Party 角色资料

状态：**五位成员的独立立绘与技能包已制作，暂不接入游戏**。这是待接入素材，不是已发布的可玩角色。

[打开立绘与技能预览](../../assets/poppinparty/preview.html)（可直接用浏览器打开）。

| 角色 | 标识 | 乐器 | 资料 |
| --- | --- | --- | --- |
| 户山香澄 | `kasumi` | 主唱／吉他 | [kasumi.json](kasumi.json) |
| 花园多惠 | `tae` | 吉他 | [tae.json](tae.json) |
| 牛込里美 | `rimi` | 贝斯 | [rimi.json](rimi.json) |
| 山吹沙绫 | `saaya` | 鼓手 | [saaya.json](saaya.json) |
| 市谷有咲 | `arisa` | 键盘 | [arisa.json](arisa.json) |

角色身份参考 [官方成员介绍](https://anime.bang-dream.com/bandorichan/character/poppinparty/)。五张立绘使用[官方校服视觉参考](https://gamebiz.jp/news/366083)由内置 image_gen 分别生成，保留正常身材、角色发型瞳色与统一校服。源图、透明PNG与完整提示词存于 `assets/poppinparty/`。

技能定义位于 `frontend/src/game/bands/poppinparty/draftMoves.ts`，其工厂仅返回招式数据，不修改全局注册表。全套包含55个招式和沙绫的1个内部反击波，共56个定义。通过共享战斗内核离线验证；正式名单未导入此模块。

| 角色 | U | I | O | P（完整命中50伤害） |
| --- | --- | --- | --- | --- |
| 香澄 | 星形拨片 | 双段追星突进 | 三次周身星环 | 五段星之鼓动 |
| 多惠 | 双拨弦波 | 三连滑音 | 兔耳音阶挑飞 | 五道前向和弦波 |
| 里美 | 巧克力螺旋面包抛射 | 双段低位闷弦 | 踏步重拨击倒 | 五段低音环 |
| 沙绫 | 双棒鼓点 | 防守反击，落空弱波 | 30护盾持续3秒 | 六次周身鼓震 |
| 有咲 | 前向琴键波 | 预警落键 | 周身键幕击退 | 固定区域五次落键 |

J三段基础伤害5／6／8、范围200；K基础伤害13、范围240；后退＋U/I/O均为发波或投掷。普通多段受现有连击衰减影响；P不受连击衰减，但仍受防御、护盾及减伤影响。全员沿用大招霸体和共鸣规则。

## 读取方式

在项目根目录执行，例如：

```powershell
npm run character:read -- kasumi
npm run character:check -- kasumi
```

其他角色替换为表中标识。也可以直接告诉助手：“读取 Poppin'Party 的香澄资料，先制作立绘，暂不接入游戏。”

五份文件使用现有模板，`identity.codeBand` 均为 `poppinparty`。当前没有注册该分组，没有分配数字 ID，没有更改选人、CPU、3v3、联机名单或运行素材。读取器显示的 `ready-for-design` 仅表示资料格式可用。使用 `node tools/build_poppinparty_drafts.mjs` 可从技能定义重新生成资料数值与离线预览。

## 后续制作

已制作独立立绘、技能定义、三段普攻与入场的动作说明，以及每人6条、共30条官方游戏原声。可在预览页试听；完整来源与截取时间见[语音资料](../../assets/poppinparty/voices/sources.json)。保持 `transformation.enabled: false`，直到明确需要变身。

动作图的每人16姿势任务已保存，因内置绘图服务连接失败仍在重试。动作图、奥义背景图和战斗中的动作／特效渲染尚未完成，不把绘图任务或说明当成已有动作贴图。

**仅在用户明确要求加入游戏后接入。** 接入时按最新注册表分配 ID，保留现有角色编号；遵循 [新角色模板说明](README.md) 完成本地与联机验证。
