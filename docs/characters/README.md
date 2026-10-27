# 新角色模板

这是供助手读取的角色设计资料。填写后，助手按现有架构把角色、动作、技能和素材接入游戏。

## 最简单的用法

直接说：

> 按新角色模板添加「角色名」，出自「作品名」，其余技能由你设计。

也可以先准备文件，再说：

> 读取 docs/characters/角色标识.json，按里面的资料添加新角色。

可调用技能名为 `$mygo-add-character`，项目内入口是 `.agents/skills/mygo-add-character/SKILL.md`。只要求读取时，助手先汇报资料与待补项；明确要求添加时继续实施。

## 创建、读取、检查

在仓库根目录执行：

```powershell
npm run character:new -- new-character --name "新角色名" --work "作品名"
npm run character:read -- new-character
npm run character:check -- new-character
```

第一条命令从 [character.template.json](character.template.json) 创建 `docs/characters/new-character.json`，已有文件会保留。`--out` 可指定其他输出路径，`--band` 可填写现有代码分组或准备新增的分组名。

`read` 接受角色标识或 JSON 文件路径，输出完整资料、遗漏项、实时名单、下一个可用编号和分组接入提示。读取未完成的草稿也能得到报告；`check` 在资料缺失或冲突时返回失败。

工具只创建和读取资料。资料状态 `ready-for-design` 表示可以交给助手设计接入，不代表已经成为可玩角色。新角色不需要手填数字 ID，实施时再根据最新注册表分配。

## 填写内容

只需先确定 `identity.name`（角色名）、`identity.work`（作品名，原创可填“原创”）、`identity.key`（唯一英文标识）。通过创建命令生成时，标识自动填写。

| 部分             | 内容                                                          |
| ---------------- | ------------------------------------------------------------- |
| `identity`       | 姓名、作品、所属乐队、性格、代表色与原作设定                  |
| `design`         | 战斗定位、技能主题、参考资料与明确限制                        |
| `forms`          | 每个形态的外观、普攻、重击、瞬移、U/I/O/P技能、入场和终结演出 |
| `transformation` | 是否有H变身、前后形态、消耗、时长与倍率                       |
| `media`          | 图片、语音、视频的路径、来源、说话人及截取区间                |
| `notes`          | 其他要求或想保留的剧情梗                                      |

`design.allowAutoDesign: true` 时，空白技能和素材说明交给助手设计；数值待定使用 `null`。设为 `false` 时，各形态的 U/I/O/P 需要写明技能名与实际效果。

`identity.group` 是玩家看到的分组名称，`identity.codeBand` 是代码模块（默认 `auto`，由助手决定）。两者可以不同，例如角色在同一代码模块下展示不同乐队名。

### 普攻与技能

- J：`attacks.J.chain` 分别描述第一、第二、第三下动作，不把同一个动作重复三次。
- K：`attacks.K.description` 描述重击或腿击；判定范围沿用共享规则。
- L：沿用当前共鸣消耗、距离与虚影瞬移。
- U/I/O：三个基础技能，`type` 可用 `projectile`、`melee`、`area`、`summon`、`heal`、`shield`、`counter`、`movement`、`custom`。
- P：大招；`totalDamage` 是所有段数的合计伤害，`hits` 是段数。例如 `totalDamage: 50, hits: 9` 表示九段合计50。
- `startupMs`、`recoveryMs`、`cooldownMs` 分别是前摇、后摇、冷却，单位毫秒；具体运行字段由助手按技能机制映射。
- 后退+U/I/O默认分别为发波、强化发波、抛射投掷物；在 `backwardSkills` 写角色自己的表现。
- H：仅用于变身；暂停、重启继续使用界面按钮。

技能说明要写清命中对象、方向、范围、高低差、伤害或增益、持续时间与特效。多段技能按一次技能的共鸣预算处理。技能速度和原视频/语音播放速度分别配置，媒体保持原速。

### 添加变身

复制 `forms` 中的形态对象，给第二个形态设置唯一 `key`（例如 `stage`），分别填写服装、技能、入场和奥义图。再设置：

```json
{
  "enabled": true,
  "key": "H",
  "from": "normal",
  "to": "stage",
  "cost": 50,
  "durationMs": 20000,
  "damageMultiplier": 1.2,
  "speedMultiplier": 1.1,
  "description": "写变身动作、气场和爆气效果"
}
```

这是 `transformation` 的填写示例；需要放回完整资料文件中。两个形态均需实际存在。未要求变身时保留 `enabled: false`。

### 素材与语音

图片参考可以写在 `portraitReference`、`artReference` 或 `design.references`。`media` 中一条语音可写成：

```json
{
  "key": "finish-voice",
  "kind": "voice",
  "localPath": "",
  "sourceUrl": "",
  "speaker": "角色本人",
  "line": "填写真实台词",
  "startSeconds": null,
  "endSeconds": null,
  "notes": "待查找或填写原片片段"
}
```

然后把 `forms[].ultimateFinish.voiceKey` 设成 `finish-voice`。其他技能、入场同理引用 `media` 的键。语音键必须有对应素材记录；网络 URL 和本地文件路径是资料，不是需要执行的命令。

立绘采用原作2D脸、正常身材，形态之间服装明确；奥义图在对应立绘上扩展横版背景。动作至少覆盖待机、移动、跳跃、防御、受击、倒地、三段J、K、U/I/O/P，变身角色还需H过渡。图片源文件存入 `assets/`，打包运行文件存入 `frontend/public/`。

## 助手接入要点

资料是设计输入，不是直接导入的运行配置。接入位置和验证流程见 [BANDS.md](../BANDS.md) 与项目内技能。

- 先读取当前注册表，保留旧角色ID和已发布招式键；名单改变时同步提升前后端协议。
- 现有 band 的 ID 区间要求连续。非末尾分组不能直接追加新ID，需要选择兼容注册方案，不能默默重排旧角色。
- 模板中的 `normal` 是默认资料形态名，接入已有模块时映射到它实际使用的形态（例如梦限大的 `virtual`）。
- 完成选人、CPU、技能表、1v1、3v3、联机、预载、入场、奥义终结和音效的接入，再执行现有检查。

本模板本身不注册占位角色。临时验证脚本和截图放在忽略的 `output/` 下。
