import { Dialog } from "../../../components/ui/Dialog";
import { bindingList } from "../../../game/controls";
import { MOVES, ROSTER } from "../../../game/engine";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
export function GameDialogs({
  view,
  runtime,
}: {
  view: GameView;
  runtime: GameRuntime;
}) {
  if (!view.dialog) return null;
  if (view.dialog === "help")
    return (
      <Dialog title="操作说明" onClose={() => runtime.closeDialog()} wide>
        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-3 text-pink-200">1P / 局域网玩家</h3>
            <p className="text-sm leading-8 text-slate-300">
              A / D 移动 · W 跳跃 · S 蹲下
              <br />J 普攻三连 · K 重击 · L 瞬移
              <br />U / I / O 三个基础技能
              <br />H 变身 · P 大招
            </p>
          </section>
          <section>
            <h3 className="mb-3 text-cyan-200">2P / 同屏双人</h3>
            <p className="text-sm leading-8 text-slate-300">
              方向键移动、跳跃与蹲下
              <br />
              小键盘 1 攻击 · 2 重击 · 3 瞬移
              <br />4 / 5 / 6 技能 · 7 变身 · 8 大招
            </p>
          </section>
        </div>
        <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm leading-7 text-slate-400">
          <p>
            按住后退防御，后退＋蹲下防下段。后＋U 或前＋O
            投技破防。方向以前后表示，换边后自动反转。方向＋U/I/O
            使用扩展技能，具体见角色招式表。
          </p>
          <p>
            W 可二段跳，↓＋W 穿台。L
            地空瞬移消耗10共鸣，冷却0.6秒。连按J三段普攻，命中可取消衔接技能与大招。触屏支持同时按方向与技能。
          </p>
          <p>
            每回合60秒，200生命，100共鸣，三局两胜。3v3
            车轮战保留胜者资源。灯与Mujica的 H
            消耗50共鸣、变身20秒，期间不能刷新。Mujica变身爆气造成10点近身伤害，变身期间伤害×1.2、移速×1.1。F1
            打开招式表。切换窗口会暂停对战。
          </p>
          <p>
            局域网对战中双方都使用1P键位。断线自动暂停，恢复连接后由玩家继续对战。页面显示往返延迟，实际体验也取决于局域网质量。
          </p>
        </div>
      </Dialog>
    );
  const identities = view.fighters.length
    ? view.fighters.map((f) => ({
        character: f.character,
        stageForm: f.character >= 5 && f.transformed,
        penguin: f.character === 2 && f.transformed,
      }))
    : [{ character: 0 }, { character: 1 }];
  return (
    <Dialog title="角色招式表" onClose={() => runtime.closeDialog()} wide>
      <div className="grid gap-8 sm:grid-cols-2">
        {identities.map((f, side) => (
          <section key={side}>
            <h3
              className="mb-4 font-semibold"
              style={{ color: ROSTER[f.character].color }}
            >
              {side + 1}P / {ROSTER[f.character].name}
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">1P / 2P</th>
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
                  <tr key={i} className="border-t border-white/10">
                    <td className="py-3 pr-3 font-mono text-pink-100">
                      {row.key} / {row.key2}
                    </td>
                    <td className="py-3 pr-3">
                      {MOVES[row.move]?.name ?? row.move}
                    </td>
                    <td className="py-3 text-slate-400">
                      {MOVES[row.move]?.cost ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-slate-500">
        前后以角色面朝方向为准。技能受能量、地空姿态、冷却与命中取消条件限制。局域网双方均使用1P键位。
      </p>
    </Dialog>
  );
}
