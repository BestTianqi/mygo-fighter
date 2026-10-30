import { Dialog } from "../../../components/ui/Dialog";
import { bandFor } from "../../../game/bands";
import { bindingList } from "../../../game/controls";
import { MOVES, ROSTER } from "../../../game/engine";
import type { GameView } from "../objects/GameView";
import type { GameRuntime } from "../runtime/GameRuntime";
export function GameDialogs({
  view,
  runtime,
}: {
  view: GameView;
  runtime: Pick<GameRuntime, "closeDialog">;
}) {
  if (!view.dialog) return null;
  if (view.dialog === "help")
    return (
      <Dialog title="操作说明" onClose={() => runtime.closeDialog()} wide>
        <p className="mb-4 text-sm leading-6 text-muted">
          先掌握移动、普攻与防御；查看「角色招式表」了解当前角色的技能与共鸣消耗。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="bg-void/4 p-4">
            <h3 className="mb-2 font-bold text-ember">1P · 单人 / 联机</h3>
            <p className="text-sm leading-8 text-ivory">
              A / D 移动 · W 跳跃 · S 蹲下
              <br />J 普攻三连 · K 重击 · L 瞬移
              <br />U / I / O 三个基础技能
              <br />H 变身（灯 / Mujica） · P 大招
            </p>
          </section>
          <section className="bg-silver/6 p-4">
            <h3 className="mb-2 font-bold text-silver">2P · 同屏双人</h3>
            <p className="text-sm leading-8 text-ivory">
              方向键移动、跳跃与蹲下
              <br />
              小键盘 1 攻击 · 2 重击 · 3 瞬移
              <br />4 / 5 / 6 技能 · 7 变身（灯 / Mujica） · 8 大招
            </p>
          </section>
        </div>
        <section className="mt-3 bg-silver/6 px-4 py-3 text-sm leading-7 text-ivory">
          <h3 className="font-bold">触屏操作</h3>
          <p>
            左侧摇杆控制移动、跳跃与蹲下。右侧攻击键轻点普攻、长按重击，其余图示按钮施放技能；可同时按住方向与技能。
          </p>
        </section>
        <div className="mt-4 divide-y divide-line text-sm leading-7 text-muted">
          <details className="py-3">
            <summary className="cursor-pointer font-bold text-ivory">
              防御、方向技与连招
            </summary>
            <p className="mt-2">
              按住后退防御，后退＋蹲下防下段。后＋U快速发波，后＋I重型音波，后＋O抛射投掷，前＋O近身投技破防。方向以前后表示，换边后自动反转。方向＋U/I/O
              使用扩展技能，具体见角色招式表。
            </p>
            <p className="mt-2">
              W 可二段跳，↓＋W 穿台。L
              地空瞬移消耗10共鸣，冷却0.6秒。连按J三段普攻，命中可取消衔接技能与大招。
            </p>
          </details>
          <details className="py-3">
            <summary className="cursor-pointer font-bold text-ivory">
              回合规则与变身
            </summary>
            <p className="mt-2">
              默认每回合60秒、200生命、100共鸣，三局两胜；自定义规则以本局设置为准。3v3
              车轮战保留胜者资源。灯与Mujica的 H
              消耗50共鸣、变身20秒，期间不能刷新。Mujica变身爆气造成10点近身伤害，变身期间伤害×1.2、移速×1.1。F1
              打开招式表。切换窗口会暂停对战，可在暂停菜单选择「继续对战」。
            </p>
          </details>
          <details className="py-3">
            <summary className="cursor-pointer font-bold text-ivory">
              三人混战
            </summary>
            <p className="mt-2">
              三人混战中三方同时登场，每人选择 3
              名不同角色，各方可使用相同角色。 角色退场后等待 5
              秒，由下一名替补登场；最后还有角色的一方获胜。 单人混战由你控制
              1P，其余两方为电脑；三人联机时各自控制自己的阵容。
            </p>
          </details>
          <details className="py-3">
            <summary className="cursor-pointer font-bold text-ivory">
              联机、暂停与重新开局
            </summary>
            <p className="mt-2">
              联机时所有玩家打开同一个服务器地址，通过房间码加入，并都使用1P键位。
              公共服务器支持跨网络对战。断线自动暂停，恢复连接后由玩家继续对战。
              页面显示往返延迟；网络距离、丢包和设备性能都会影响体验。
              任意玩家均可暂停与继续；房主可重新开局。返回房间可以重新选人，离开房间会回到主菜单。
            </p>
          </details>
        </div>
      </Dialog>
    );
  const identities = view.fighters.length
    ? view.fighters.map((f) => ({
        character: f.character,
        stageForm: bandFor(f.character).id !== "mygo" && f.transformed,
        penguin: f.character === 2 && f.transformed,
      }))
    : [{ character: 0 }, { character: 1 }];
  return (
    <Dialog title="角色招式表" onClose={() => runtime.closeDialog()} wide>
      <div
        className={`grid gap-4 ${identities.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {identities.map((f, side) => (
          <section key={side} className="min-w-0 bg-void/3 p-3 sm:p-4">
            <h3 className="mb-3 font-bold text-ivory">
              {side + 1}P / {ROSTER[f.character].name}
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="pb-3">键位 1P / 2P</th>
                  <th className="pb-3">招式</th>
                  <th className="pb-3">共鸣</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { move: "light", key: "J", key2: "1" },
                  { move: "heavy", key: "K", key2: "2" },
                  ...bindingList(f),
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-mono text-ember">
                      {row.key} / {row.key2}
                    </td>
                    <td className="py-2.5 pr-3 text-ivory">
                      {MOVES[row.move]?.name ?? row.move}
                      {MOVES[row.move]?.lifestealBuff && (
                        <span className="mt-1 block text-[10px] text-ember">
                          出拳后吸血{" "}
                          {MOVES[row.move].lifestealBuff!.ratio * 100}% ·{" "}
                          {MOVES[row.move].lifestealBuff!.duration / 1000}秒
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-muted">
                      {MOVES[row.move]?.cost ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {f.character === 6 && (
              <p className="mt-3 text-xs leading-6 text-muted">
                P：立即禁锢周身圆形区域内的敌人，腾空降下三轮音波。
                范围330，合计48伤害，变身后57.6伤害。完整台词会继续播完。
              </p>
            )}
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-muted">
        2P 数字键为小键盘。{" "}
        前后以角色面朝方向为准。后＋U快速发波，后＋I重型音波，后＋O抛射投掷；前＋O仍为近身投技。技能受能量、地空姿态、冷却与命中取消条件限制。联机玩家均使用1P键位。
      </p>
    </Dialog>
  );
}
