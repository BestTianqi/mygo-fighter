**简体中文** | [English](BANDS.en.md) | [日本語](BANDS.ja.md)

# 乐队

关于可复用的角色接入模板与读取/创建命令，见[新角色模板](characters/README.md)。可调用的工作流是 `.agents/skills/mygo-add-character/SKILL.md`。

**乐队（band）** 是一个角色阵容分组，拥有自己的角色、招式、形态与打法。MyGO、Mujica 与 MewType 都是乐队；没有任何乐队是引擎特殊处理的“默认”乐队。战斗内核、UI 与服务器都从 `frontend/src/game/bands/` 中的注册表推导每一项乐队决策。

## 目录结构

```text
frontend/src/game/bands/
  index.ts                       registry: BANDS, bandFor(id), CHARACTERS
  contract.ts                    defineBand() defaults
  validation.ts                  validateBands(), validateCatalog()
  shared/                        cross-band commands, derived moves and templates
    superPulses.ts               common pulse spacing, without character choices
  <band>/
    index.ts                     defineBand({...})
    roster.ts, forms.ts           roster and form-selection rules
    moves.ts                     catalog assembly and registration order
    characters/
      <character-key>/
        <form>.ts                this character/form's authored move definitions
    shared/                      reusable normal, projectile and registrar templates
    ability.ts, tune.ts           band behavior and post-balance tuning
```

同一条归属规则适用于每个已注册角色。MyGO 的爱音、素世、灯、乐奈与立希使用 `characters/<key>/base.ts`；灯的变身招式与她的基础招式并列放在 `characters/tomori/penguin.ts` 中。Mujica 为每名角色提供 `normal.ts` 与 `stage.ts`。MewType 为每名角色提供 `virtual.ts`，包括薇欧拉。角色模块拥有各自编写的普攻名称、技能、大招、发波变体、后退技能来源与 MyGO 的 J 连段选择。共用模板包含这些模块复用的构建逻辑。

乐队的 `moves.ts` 按发布时的注册顺序装配各形态。普攻、技能、大招与派生招式可能需要各自独立的处理轮次；按角色分组源文件不得改变目录插入顺序或指令列表的行顺序。MyGO 的 `chains.ts` 同样围绕共用的缩放处理来装配角色自有的连段选择。角色形态可以引用自身的其他形态或共用模板；它们不得伸入另一个角色的实现。前端的归属检查会强制这条边界。

`data/` 只保留跨乐队装配：`roster.ts`（扁平列表与共用速度/跳跃缩放）、`createMoveCatalog.ts`（轮次顺序）、`listMoves.ts`（分发）、`moves/scale.ts`（共用移动缩放）与 `moves/balance.ts`（共用调参）。`poppinparty/draftMoves.ts` 创作工厂仍未注册，不会让这些角色变为可玩。

## Band 契约

`defineBand(spec)` 会填充所有默认值，因此没有特殊机制的乐队只需声明 `id`、`characters` 与 `moves`。返回的 `Band` 暴露：

| 字段                                          | 含义                                                   |
| --------------------------------------------- | ------------------------------------------------------ |
| `id`, `label`, `characters`, `moves`, `forms` | 身份与数据                                             |
| `unified`                                     | 使用 U/I/O 技能方案而非指令表来游玩                    |
| `formFor`, `prefixFor`, `normalFor`           | 形态与招式键命名                                       |
| `schemeFor`, `extraBindings`                  | 操作列表与游戏内指令列表                               |
| `movesFor(all, character, penguin)`           | 为该角色显示的招式列表                                 |
| `owns(f, move, name)`                         | 本乐队的招式合法性                                     |
| `profileFor(f)`                               | `Character` 档案，含形态变体                           |
| `stanceLocked(f)`, `cancelDepth(f)`           | 架势限制与取消预算                                     |
| `command(match, f, requested, input)`         | 按键 → 招式名                                          |
| `skill(f, input, pressed, airborne)`          | 额外的统一模式技能                                     |
| `airCancel`, `extraCancel`                    | 取消例外                                               |
| `beforeStart(match, f, name)`                 | 招式开始前升级（节拍增益）                             |
| `onStart(match, f, move, name, ground)`       | 每个招式的起手物理                                     |
| `ai(match, side, input)`                      | 乐队 CPU 战术                                          |
| `tune(moves)`                                 | 平衡后的招式覆盖                                       |
| `transform`                                   | 可选的分阶段形态（`move`、`duration`、`energy`、倍率） |
| `presentation`                                | 可选的 UI 素材分区提示                                 |

默认值：单一形态 `"base"`，键为 `<band>_<id>_<form>_<slot>`（或该乐队的 `prefixFor`），归属由 `ownerCharacter`/通用招式决定，`stanceLocked` 为 true，取消深度为 4，没有 command/ai/tune/transform。

## 新增乐队

1. **创建文件夹** `frontend/src/game/bands/<id>/`。添加带有连续显式 `id` 的 `roster.ts`。ID 必须在整个注册表中保持连续（当前角色阵容止于 15，因此新乐队从 16 开始）。
2. **添加招式。** 把编写好的数值放进 `characters/<key>/<form>.ts`，把可复用的构建逻辑放进乐队的 `shared/`。在 `moves.ts` 中装配出键唯一的 `Record<string, Move>`，新乐队的标准方案使用 `<band>_<id>_<form>_<slot>`。招式键跨越局域网边界，因此绝不要在未提升协议版本的情况下重命名已发布的键。为每个招式指定 `ownerCharacter`；若乐队有多个形态，还要指定 `form`。
3. **添加 `index.ts`** 并调用 `defineBand`：

   ```ts
   import { defineBand } from "../contract";
   import { MOVES } from "./moves";
   import { CHARACTERS } from "./roster";

   export const BAND = defineBand({
     id: "newband",
     label: "NEW BAND",
     characters: CHARACTERS,
     moves: MOVES,
     forms: ["base"],
   });
   ```

   只添加乐队真正需要的钩子（`schemeFor`、`command`、`ai`、`transform`、`tune` 等）。声明了多个形态的乐队还必须传入 `formFor`。

4. **注册它**，在 `frontend/src/game/bands/index.ts` 中：

   ```ts
   import { BAND as newband } from "./newband";
   const REGISTERED: Band[] = [mygo, mujica, newband];
   ```

   注册顺序无关紧要：`validateBands` 会按角色 ID 排序。

5. **添加美术**到运行时清单与 `scripts/check-assets.mjs` 的数据中：角色/关卡计数现在从内核注册表读取，因此无需再编辑计数常量。更新 `frontend/src/game/objects/BandId.ts`（`BandId` 联合类型与 `BAND_LABEL`）。
6. **测试**：`npm run check`（类型检查 + 素材 + 内核契约测试）、`npm run build`，然后执行 `docs/LAN.md` 中的局域网冒烟流程。

新增乐队不得要求修改 `match/`、`controls.ts`、`combatData.ts` 或任何其他乐队的文件夹。如果某个共用文件需要乐队 ID，说明契约缺少一项能力——应当把它加到 `Band`/`defineBand`，而不是改共用文件。

## 不变量

- 角色 ID 覆盖 `0..N-1` 且没有空缺；每个乐队的 ID 连续，并由 `defineBand` 排序。
- 招式键全局唯一；目录在启动时拒绝重复的键。
- 注册顺序是战斗规则的一部分。`createMoveCatalog` 依次执行：按 ID 顺序的乐队招式 → 共用 J 连段 → 共用缩放 → 连段 → 平衡 → 乐队 `tune` 轮次 → 目录校验。
- 基础乐队的 `formFor` 必须保持不变，其招式不得声明 `form`，否则企鹅模式无法启动它的普攻。
- `Match`、`Fighter` 与快照字段对网络可见。未提升协议版本时，不要新增或重命名字段。
- 协议版本位于 `frontend/src/game/networkProtocol.ts` 与 `GameProtocol.Version`（Scala）；`scripts/check-protocol.mjs` 保持两者相等。角色阵容变化属于协议变更。
- 由角色阵容驱动的服务器限制由 `scripts/build-simulation.mjs` 输出到 `backend/src/main/resources/roster.json`。

## 验证

```bash
npm run check          # 类型检查、素材、乐队契约
npm run build          # 内核打包、simulation.js、roster.json
npm run check:backend  # Scala 编译 + scalafmt
```
