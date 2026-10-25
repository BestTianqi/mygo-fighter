import { useState } from "react";
import type { Assets } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { Button } from "../../../components/ui/Button";
const bands = [
  { key: "mygo", name: "MyGO!!!!!", ids: [1, 4, 3, 2, 0] },
  { key: "mujica", name: "Ave Mujica", ids: [5, 7, 8, 9, 6] },
  { key: "mewtype", name: "夢限大 MewType", ids: [11, 12, 13, 14, 10] },
];
export function MainMenu({
  assets,
  runtime,
  view,
}: {
  assets: Assets;
  runtime: GameRuntime | null;
  view: GameView;
}) {
  const [bandIndex, setBand] = useState(0);
  const band = bands[bandIndex];
  return (
    <section
      className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#080e1c]"
      aria-label="主菜单"
    >
      <img
        src={assets.backgrounds[view.config?.settings.arena ?? 0]}
        alt=""
        className="absolute inset-0 -z-30 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#080e1c] via-[#080e1ce8] to-[#080e1c22]" />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5 lg:px-12">
        <span className="text-sm font-black tracking-[.22em]">
          MyGO!!!!! <span className="font-light text-slate-400">FIGHTING</span>
        </span>
        <nav className="flex gap-1" aria-label="主视觉乐队">
          {bands.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setBand(i)}
              aria-pressed={i === bandIndex}
              className={`rounded-full px-3 py-1.5 text-xs transition ${i === bandIndex ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {item.name}
            </button>
          ))}
        </nav>
      </header>
      <div className="pointer-events-none absolute inset-x-0 bottom-12 top-[23%] -z-20 flex items-end justify-end pl-[18%] opacity-65 sm:top-[18%] lg:pl-[35%] lg:opacity-100">
        {band.ids.map((id, i) => (
          <img
            key={id}
            src={
              assets.mujicaPortraits[id]?.stage.portrait ??
              assets.characters[id].portrait
            }
            alt=""
            className={`max-h-full min-w-0 object-contain drop-shadow-2xl ${i === 4 ? "-ml-[15%] w-[37%]" : "-mr-[6%] w-[26%]"}`}
          />
        ))}
      </div>
      <div className="flex flex-1 items-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-lg">
          <p className="mb-5 flex items-center gap-3 text-xs tracking-[.26em] text-cyan-200">
            <span className="h-px w-8 bg-cyan-200" />
            LIVE / 迷途回响
          </p>
          <h1 className="text-7xl font-black leading-[1.04] tracking-tighter sm:text-8xl">
            迷途
            <span className="block text-pink-200">
              回响<span className="text-3xl text-white">!!!!!</span>
            </span>
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-300">
            选择你的同伴，让回响登上舞台。
          </p>
          <div className="mt-9 grid max-w-sm grid-cols-2 gap-2.5">
            {view.phase !== "idle" && (
              <Button
                primary
                onClick={() => runtime?.resume()}
                className="col-span-2 text-left"
              >
                继续对战 ↗
              </Button>
            )}
            <Button
              primary
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
              className="col-span-2 flex justify-between py-4 text-base"
            >
              <span>
                开始对战{" "}
                <small className="ml-2 font-normal opacity-60">单人对战</small>
              </span>
              <span>↗</span>
            </Button>
            <Button onClick={() => runtime?.begin("duel")}>本地双人</Button>
            <Button onClick={() => runtime?.begin("cpu", "3v3")}>
              3v3 车轮战
            </Button>
            <Button onClick={() => runtime?.begin("practice")}>自由练习</Button>
            <Button
              disabled={import.meta.env.MODE === "pages" || !runtime}
              title={
                import.meta.env.MODE === "pages"
                  ? "局域网联机请下载游戏并本地启动"
                  : undefined
              }
              onClick={() => runtime?.openLobby()}
            >
              {import.meta.env.MODE === "pages"
                ? "局域网联机 · 需本地启动"
                : "局域网联机"}
            </Button>
          </div>
          <div className="mt-6 flex gap-6 text-xs text-slate-400">
            <button
              onClick={() => runtime?.begin("cpu")}
              className="hover:text-white"
            >
              对战设置
            </button>
            <button
              onClick={() => runtime?.showDialog("help")}
              className="hover:text-white"
            >
              操作说明
            </button>
          </div>
        </div>
      </div>
      <footer className="flex justify-between border-t border-white/10 px-6 py-4 text-[10px] tracking-widest text-slate-400 lg:px-12">
        <span>
          {assets.characters.length} 位角色 / {assets.stages.length} 张舞台
        </span>
        <span>LOCAL + LAN PLAY</span>
      </footer>
    </section>
  );
}
