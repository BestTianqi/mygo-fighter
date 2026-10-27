# Poppin'Party 角色资料

状态：**五位成员的资料已建立，暂不接入游戏**。这是后续制作的输入资料，不是可玩角色模块。

| 角色 | 标识 | 乐器 | 资料 |
| --- | --- | --- | --- |
| 户山香澄 | `kasumi` | 主唱／吉他 | [kasumi.json](kasumi.json) |
| 花园多惠 | `tae` | 吉他 | [tae.json](tae.json) |
| 牛込里美 | `rimi` | 贝斯 | [rimi.json](rimi.json) |
| 山吹沙绫 | `saaya` | 鼓手 | [saaya.json](saaya.json) |
| 市谷有咲 | `arisa` | 键盘 | [arisa.json](arisa.json) |

角色身份参考 [官方成员介绍](https://anime.bang-dream.com/bandorichan/character/poppinparty/)，个别设定与立绘参考链接保存在每份 JSON 的 `design.references` 中。技能主题只是后续设计方向，尚无技能实现或新绘立绘。没有下载或接入音视频素材。

## 读取方式

在项目根目录执行，例如：

```powershell
npm run character:read -- kasumi
npm run character:check -- kasumi
```

其他角色替换为表中标识。也可以直接告诉助手：“读取 Poppin'Party 的香澄资料，先制作立绘，暂不接入游戏。”

五份文件使用现有模板，`identity.codeBand` 均为 `poppinparty`。当前没有注册该分组，没有分配数字 ID，没有更改选人、CPU、3v3、联机名单或运行素材。读取器显示的 `ready-for-design` 仅表示资料格式可用。

## 后续制作

已填写角色姓名、乐器、原作参考与制作约束。技能名、伤害、动作、语音、入场及奥义终结素材仍待制作；模板中的默认消耗不代表最终方案。保持 `transformation.enabled: false`，直到明确需要变身。

**仅在用户明确要求加入游戏后接入。** 接入时按最新注册表分配 ID，保留现有角色编号；遵循 [新角色模板说明](README.md) 完成本地与联机验证。
