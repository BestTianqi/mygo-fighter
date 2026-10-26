import { useState } from "react";
import type { Assets } from "../../../game/objects/Assets";
import type { GameRuntime } from "../functions/GameRuntime";
import type { GameView } from "../objects/GameView";
import { Button } from "../../../components/ui/Button";
import { bandPortrait } from "../functions/bandArt";
import { publicGameURL } from "../functions/publicGameURL";
const bands = [
  { key: "mygo", name: "MyGO!!!!!", ids: [1, 4, 3, 2, 0] },
  { key: "mujica", name: "Ave Mujica", ids: [5, 7, 8, 9, 6] },
  { key: "mewtype", name: "夢限大 MewType", ids: [11, 12, 13, 14, 10] },
];
export function MainMenu({
  assets,
  runtime,
  view,
  onResume,
}: {
  assets: Assets;
  runtime: GameRuntime | null;
  view: GameView;
  onResume: () => void;
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
        className="absolute inset-0 -z-30 size-full object-cover opacity-25"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#080e1c] via-[#080e1cbb] to-transparent" />
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
              className={`min-h-10 touch-manipulation rounded-md border border-transparent px-3 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-cyan-200 ${i === bandIndex ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {item.name}
            </button>
          ))}
        </nav>
      </header>
      <div
        aria-hidden="true"
        className="pointer-events-none relative mx-5 mt-6 flex h-64 gap-1 overflow-hidden sm:h-80 lg:absolute lg:inset-y-32 lg:right-8 lg:mt-0 lg:ml-0 lg:h-auto lg:w-[55%] lg:-skew-x-6"
      >
        {band.ids.map((id, i) => (
          <div
            key={id}
            className={`relative min-w-0 flex-1 overflow-hidden border-t-2 border-white/25 bg-white/5 ${i % 2 ? "mt-8" : "mb-8"}`}
          >
            <img
              src={
                bandPortrait(assets, id, "stage")?.portrait ??
                assets.characters[id].portrait
              }
              alt=""
              className={`absolute top-5 h-[105%] max-w-none -translate-x-1/2 object-contain lg:skew-x-6 ${id === 3 ? "left-[65%]" : "left-1/2"}`}
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#080e1c] via-transparent to-transparent" />
          </div>
        ))}
        <span className="absolute bottom-2 right-3 text-xs font-bold tracking-[.24em] text-white/70 lg:skew-x-6">
          {band.name}
        </span>
      </div>
      <div className="flex flex-1 items-center px-6 py-6 lg:min-h-[650px] lg:px-12 lg:py-12">
        <div className="w-full lg:max-w-[43%]">
          <p className="mb-4 flex items-center gap-3 text-xs tracking-[.26em] text-cyan-200">
            <span className="h-px w-8 bg-cyan-200" />
            BAND BATTLE / 乐队格斗
          </p>
          <h1 className="text-5xl font-black leading-[1.04] tracking-tighter sm:text-7xl lg:text-8xl">
            迷途
            <span className="block text-pink-200">
              回响<span className="text-3xl text-white">!!!!!</span>
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            选择你的同伴，让回响登上舞台。
          </p>
          <div className="mt-7 grid max-w-lg grid-cols-2 gap-2.5">
            {view.phase !== "idle" && (
              <Button
                primary
                onClick={onResume}
                className="col-span-2 text-left"
              >
                继续对战 ↗
              </Button>
            )}
            <Button
              primary
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
              className="col-span-2 flex items-center justify-between py-5 text-base"
            >
              <span>
                开始对战{" "}
                <small className="ml-2 font-normal opacity-60">单人对战</small>
              </span>
              <span>↗</span>
            </Button>
            <Button
              disabled={!runtime}
              onClick={() => runtime?.begin("duel")}
              className="text-left"
            >
              本地双人{" "}
              <span className="float-right text-xs text-slate-400">2P</span>
            </Button>
            <Button
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu", "3v3")}
              className="text-left"
            >
              3v3 车轮战
            </Button>
            <Button
              disabled={!runtime}
              onClick={() => runtime?.begin("practice")}
              className="text-left"
            >
              自由练习
            </Button>
            <Button
              disabled={
                (import.meta.env.MODE === "pages" && !publicGameURL) || !runtime
              }
              className="text-left"
              title={
                import.meta.env.MODE === "pages" && !publicGameURL
                  ? "联机对战请下载游戏并启动服务器"
                  : undefined
              }
              onClick={() => {
                if (import.meta.env.MODE === "pages" && publicGameURL)
                  location.assign(publicGameURL);
                else runtime?.openLobby();
              }}
            >
              {import.meta.env.MODE === "pages"
                ? publicGameURL
                  ? "广域网联机 ↗"
                  : "联机对战 · 需服务器"
                : "联机对战"}
            </Button>
          </div>
          <div className="mt-6 flex gap-6 text-xs text-slate-400">
            <button
              onClick={() => runtime?.showDialog("help")}
              className="inline-flex min-h-11 touch-manipulation items-center rounded px-1 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200"
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
        <span>MyGO!!!!! × Ave Mujica × 夢限大</span>
      </footer>
    </section>
  );
}
