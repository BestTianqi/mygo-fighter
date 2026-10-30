import { useState } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import type { GameRuntime } from "../runtime/GameRuntime";
import type { GameView } from "../objects/GameView";
import { Button } from "../../../components/ui/Button";
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
  const [bandIndex, setBandIndex] = useState(1);
  const band = bands[bandIndex];
  const onlineDisabled =
    (import.meta.env.MODE === "pages" && !publicGameURL) || !runtime;
  const resumable = ["ready", "fighting", "roundOver"].includes(view.phase);
  const theater = assets.stages.findIndex((stage) => stage.id === "theater");
  const modes = [
    { label: "本地双人", run: () => runtime?.begin("duel") },
    { label: "车轮战", run: () => runtime?.begin("cpu", "3v3") },
    { label: "三人混战", run: () => runtime?.begin("cpu", "3ffa") },
    { label: "自由练习", run: () => runtime?.begin("practice") },
  ];
  return (
    <section
      aria-label="主菜单"
      className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-void text-ivory"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <img
          src={assets.backgrounds[Math.max(0, theater)]}
          alt=""
          className="absolute inset-0 size-full object-cover object-[65%_center] opacity-50"
        />
        <div className="absolute inset-0 bg-linear-to-r from-void via-void/80 to-void/10" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-void to-transparent" />
      </div>
      <header className="relative flex min-h-20 items-center justify-between gap-4 px-6 sm:px-12 lg:px-18">
        <p className="text-sm font-black tracking-tight">
          MyGO!!!!!{" "}
          <span className="ml-2 text-[10px] font-medium tracking-[.24em] text-muted">
            FIGHTER
          </span>
        </p>
        <Button
          onClick={() => runtime?.showDialog("help")}
          disabled={!runtime}
          aria-label="操作说明"
          className="text-xs"
        >
          操作说明
        </Button>
      </header>
      <div className="mx-auto grid w-full max-w-[1680px] flex-1 items-center gap-8 px-6 py-4 sm:px-12 sm:py-8 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:gap-10 lg:px-18">
        <div className="relative order-2 w-full lg:order-1 lg:max-w-[460px]">
          <p className="mb-4 font-display text-[10px] tracking-[.35em] text-ember sm:mb-6 sm:text-xs">
            THE STAGE IS YOURS
          </p>
          <h1
            aria-label="武道馆当然要比武"
            className="font-display text-[clamp(2.75rem,6vw,5rem)] leading-[1.28] font-black tracking-[.02em]"
          >
            <span className="block">武道馆</span>
            <span className="block">当然要比武</span>
          </h1>
          <div className="mt-6 grid gap-2 sm:mt-10">
            {resumable && (
              <Button onClick={onResume} className="w-full">
                继续对战
              </Button>
            )}
            <Button
              primary
              aria-label="开始对战"
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
              className="min-h-16 w-full px-5 text-center text-base"
            >
              开始对战
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => (
                <Button
                  key={mode.label}
                  aria-label={mode.label}
                  disabled={!runtime}
                  onClick={mode.run}
                  className="min-h-12 bg-panel/90"
                >
                  {mode.label}
                </Button>
              ))}
              <Button
                aria-label="联机对战"
                disabled={onlineDisabled}
                onClick={() =>
                  import.meta.env.MODE === "pages" && publicGameURL
                    ? location.assign(publicGameURL)
                    : runtime?.openLobby()
                }
                className="col-span-2 min-h-12 bg-panel/90 px-5 text-center"
              >
                联机对战
              </Button>
            </div>
            {onlineDisabled && import.meta.env.MODE === "pages" && (
              <p className="mt-1 text-xs leading-5 text-muted">
                联机请打开主机提供的游戏地址。
              </p>
            )}
          </div>
        </div>
        <div className="relative order-1 min-w-0 lg:order-2">
          <svg
            role="img"
            aria-label={`${band.name} 全员`}
            viewBox="0 0 1900 1100"
            className="mx-auto h-[clamp(180px,45vw,360px)] w-full lg:h-[clamp(360px,60dvh,680px)]"
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
          <nav
            aria-label="主视觉乐队"
            className="mx-auto mt-3 grid max-w-xl grid-cols-3 gap-1.5 lg:mt-6"
          >
            {bands.map((item, index) => (
              <Button
                key={item.key}
                primary={index === bandIndex}
                aria-pressed={index === bandIndex}
                onClick={() => setBandIndex(index)}
                className="min-w-0 px-1 text-[10px] sm:text-xs"
              >
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>
      <footer className="relative flex justify-end px-6 py-5 text-[10px] tracking-wider text-muted sm:px-12 lg:px-18">
        <span>非官方同人格斗游戏</span>
      </footer>
    </section>
  );
}
