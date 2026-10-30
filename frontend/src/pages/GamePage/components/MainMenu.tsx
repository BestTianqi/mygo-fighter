import { ArrowUpRight } from "./ArrowUpRight";
import { useState } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import type { GameRuntime } from "../runtime/GameRuntime";
import type { GameView } from "../objects/GameView";
import { Button } from "../../../components/ui/Button";
import { publicGameURL } from "../functions/publicGameURL";
const bands = [
  { key: "mygo", name: "MyGO!!!!!", ids: [1, 4, 3, 2, 0], color: "#47c5dd" },
  { key: "mujica", name: "Ave Mujica", ids: [5, 7, 8, 9, 6], color: "#ec879c" },
  {
    key: "mewtype",
    name: "夢限大 MewType",
    ids: [11, 12, 13, 14, 10],
    color: "#c4affa",
  },
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
  const onlineDisabled =
    (import.meta.env.MODE === "pages" && !publicGameURL) || !runtime;
  const resumable = ["ready", "fighting", "roundOver"].includes(view.phase);
  const modes = [
    {
      label: "本地双人",
      hint: "同一键盘，双人对决",
      icon: "VS",
      run: () => runtime?.begin("duel"),
    },
    {
      label: "车轮战",
      hint: "每方三人，接力登场",
      icon: "3v3",
      run: () => runtime?.begin("cpu", "3v3"),
    },
    {
      label: "三人混战",
      hint: "三方同场，各带三名角色",
      icon: "三方",
      run: () => runtime?.begin("cpu", "3ffa"),
    },
    {
      label: "自由练习",
      hint: "试招、连段与招式说明",
      icon: "练习",
      run: () => runtime?.begin("practice"),
    },
  ];
  return (
    <section
      aria-label="主菜单"
      className="min-h-dvh bg-[#f3f7fc] text-[#101d33]"
    >
      <header className="flex min-h-18 items-center justify-between gap-4 border-b border-[#d9e2ef] px-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-end justify-center gap-1 bg-[#101d33] p-2"
          >
            <i className="h-3 w-1 bg-[#47c5dd]" />
            <i className="h-5 w-1 bg-[#ec879c]" />
            <i className="h-4 w-1 bg-[#c4affa]" />
          </span>
          <span className="font-black tracking-tight">
            MyGO!!!!!{" "}
            <span className="ml-1 text-xs font-medium tracking-[.18em] text-[#61718b]">
              FIGHTER
            </span>
          </span>
        </div>
        <button
          aria-label="操作说明"
          onClick={() => runtime?.showDialog("help")}
          disabled={!runtime}
          className="min-h-11 px-3 text-sm font-semibold text-[#61718b] transition hover:text-[#bb3266] disabled:opacity-40"
        >
          操作说明 <ArrowUpRight className="ml-1 inline size-4" />
        </button>
      </header>
      <div className="mx-auto grid max-w-[1720px] lg:min-h-[calc(100dvh-7.5rem)] lg:grid-cols-[minmax(360px,.8fr)_1.2fr]">
        <div className="order-2 flex flex-col justify-center px-5 py-7 sm:px-10 sm:py-10 lg:order-1 lg:pr-12">
          <p className="mb-3 text-xs font-bold tracking-[.16em] text-[#61718b]">
            乐队格斗 · 现在登台
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            选择你的阵容，
            <br />
            <span className="text-[#bb3266]">奏响这一战。</span>
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#61718b]">
            从选人开始，挑战电脑或与朋友一起对战。
          </p>
          <div className="mt-7 grid gap-3">
            {resumable && (
              <Button primary onClick={onResume} className="w-full">
                继续未完成的对战
              </Button>
            )}
            <button
              aria-label="开始对战"
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
              className="group flex min-h-20 items-center justify-between gap-4 bg-[#101d33] px-5 py-4 text-left text-white transition hover:bg-[#1d3557] disabled:opacity-40"
            >
              <span>
                <strong className="block text-lg">开始对战</strong>
                <span className="mt-1 block text-xs text-slate-300">
                  挑选角色，自由设置电脑难度
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-2xl text-[#47c5dd] transition-transform group-hover:translate-x-1"
              >
                <ArrowUpRight className="size-6 rotate-45" />
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.label}
                  aria-label={mode.label}
                  disabled={!runtime}
                  onClick={mode.run}
                  className="min-h-23 border border-[#d9e2ef] bg-white px-4 py-3 text-left transition hover:border-[#1aa8b8] hover:bg-[#eaf8fb] disabled:opacity-40"
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{mode.label}</strong>
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] text-[#61718b]"
                    >
                      {mode.icon}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-[#61718b]">
                    {mode.hint}
                  </span>
                </button>
              ))}
            </div>
            <button
              aria-label="联机对战"
              disabled={onlineDisabled}
              onClick={() =>
                import.meta.env.MODE === "pages" && publicGameURL
                  ? location.assign(publicGameURL)
                  : runtime?.openLobby()
              }
              className="flex min-h-16 items-center justify-between gap-4 border border-[#d9e2ef] bg-white px-4 py-3 text-left transition hover:border-[#1aa8b8] disabled:opacity-45"
            >
              <span>
                <strong className="text-sm">联机对战</strong>
                <span className="ml-3 text-xs text-[#61718b]">
                  创建房间或输入房间码
                </span>
              </span>
              <ArrowUpRight />
            </button>
            {onlineDisabled && import.meta.env.MODE === "pages" && (
              <p className="text-xs leading-5 text-[#61718b]">
                此页面可直接单机游玩。联机请打开主机提供的游戏地址。
              </p>
            )}
          </div>
        </div>
        <div className="relative order-1 min-h-68 overflow-hidden bg-[#101d33] sm:min-h-80 lg:order-2 lg:min-h-[660px]">
          <img
            src={assets.backgrounds[0]}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-30"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-[#101d33] via-[#101d33]/20 to-transparent"
          />
          <p className="absolute top-5 right-5 left-5 z-10 flex items-center justify-between text-[10px] font-semibold tracking-[.15em] text-white/65 sm:top-7 sm:right-7 sm:left-7">
            <span>ON STAGE</span>
            <span>{band.name}</span>
          </p>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-10 bottom-16 px-2 sm:top-14 lg:top-22 lg:bottom-24"
          >
            <svg
              viewBox="0 0 1900 1100"
              preserveAspectRatio="xMidYMid meet"
              className="size-full"
            >
              {band.ids.map((id, i) => (
                <image
                  key={id}
                  href={
                    bandPortrait(assets, id, "stage")?.portrait ??
                    assets.characters[id].portrait
                  }
                  x={i * 310}
                  y={i % 2 ? 30 : 0}
                  width={660}
                  height={1040}
                  preserveAspectRatio="xMidYMax meet"
                />
              ))}
            </svg>
          </div>
          <nav
            aria-label="主视觉乐队"
            className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-1 border-t border-white/15 pt-3 sm:inset-x-7 sm:bottom-6"
          >
            {bands.map((item, i) => (
              <button
                key={item.key}
                aria-pressed={i === bandIndex}
                onClick={() => setBand(i)}
                className={`min-h-11 px-1 text-[10px] font-semibold transition sm:text-xs ${i === bandIndex ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}
                style={{
                  borderBottom: `2px solid ${i === bandIndex ? item.color : "transparent"}`,
                }}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-[#d9e2ef] px-5 py-4 text-[10px] text-[#61718b] sm:px-10">
        <span>
          {assets.characters.length} 位角色 · {assets.stages.length} 处舞台
        </span>
        <span>非官方同人格斗游戏</span>
      </footer>
    </section>
  );
}
