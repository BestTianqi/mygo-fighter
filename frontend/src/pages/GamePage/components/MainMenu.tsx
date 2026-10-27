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
  const onlineDisabled =
    (import.meta.env.MODE === "pages" && !publicGameURL) || !runtime;
  const menuButton =
    "flex min-h-14 items-center justify-between rounded-none bg-[#30251a]/4 px-4 text-left text-sm font-medium transition hover:bg-[#a44761]/8 hover:text-[#8f354e] disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#a44761]";
  return (
    <section
      className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#f5f0e5] text-[#211f1a]"
      aria-label="主菜单"
    >
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3  px-5 py-4 sm:px-10 lg:px-14">
        <span className="text-xl font-semibold italic tracking-tight">
          MyGO!!!!!
          <span className="ml-2 text-[10px] font-bold not-italic tracking-[.2em]">
            FIGHTER
          </span>
        </span>
        <button
          className="min-h-11 rounded-none bg-[#30251a]/5 px-5 text-xs font-bold hover:text-[#8f354e]"
          onClick={() => runtime?.showDialog("help")}
        >
          HOW TO PLAY ↗
        </button>
      </header>
      <div className="relative mx-auto grid w-full max-w-[1700px] flex-1 lg:grid-cols-[44%_56%]">
        <div className="relative z-10 order-2 flex flex-col justify-center px-5 pt-5 pb-8 sm:px-10 lg:order-1 lg:py-10 lg:pl-14 lg:pr-6">
          <p className="flex items-center gap-3 text-[10px] font-bold tracking-[.25em] text-[#946b2a]">
            <span className="h-0.5 w-7 bg-[#a44761]" />
            LET YOUR SOUND FIGHT.
          </p>
          <h1 className="mt-4 font-[Songti_SC,STSong,Iowan_Old_Style,serif] text-[clamp(2.8rem,6.4vw,6rem)] font-medium leading-[1.15] tracking-tight">
            迷途之音，
            <br />
            <span className="text-[#a44761]">响彻战场。</span>
          </h1>
          <p className="mt-5 text-xs leading-6 text-[#6f6759] sm:text-sm">
            把未曾说出口的心声，化作全力以赴的一击。
            <br />
            你的乐队，你的主场。现在，登台！
          </p>
          <div className="mt-6 max-w-lg">
            {view.phase !== "idle" && (
              <Button primary onClick={onResume} className="mb-3 w-full">
                继续对战 ↗
              </Button>
            )}
            <Button
              primary
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
              className="flex w-full items-center justify-between py-4 text-base"
            >
              <span>
                开始对战{" "}
                <small className="ml-2 text-[10px] font-medium tracking-widest opacity-80">
                  SOLO BATTLE
                </small>
              </span>
              <span className="text-xl">↗</span>
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={menuButton}
                disabled={!runtime}
                onClick={() => runtime?.begin("duel")}
              >
                本地双人{" "}
                <span className="text-[10px] text-[#80786d]">VERSUS / 02</span>
              </button>
              <button
                className={menuButton}
                disabled={onlineDisabled}
                onClick={() =>
                  import.meta.env.MODE === "pages" && publicGameURL
                    ? location.assign(publicGameURL)
                    : runtime?.openLobby()
                }
              >
                联机对战{" "}
                <span className="text-[10px] text-[#80786d]">ONLINE ↗</span>
              </button>
              <button
                className={menuButton}
                disabled={!runtime}
                onClick={() => runtime?.begin("cpu", "3v3")}
              >
                车轮战{" "}
                <span className="text-[10px] text-[#80786d]">3 vs 3</span>
              </button>
              <button
                className={menuButton}
                disabled={!runtime}
                onClick={() => runtime?.begin("practice")}
              >
                自由练习{" "}
                <span className="text-[10px] text-[#80786d]">TRAINING</span>
              </button>
            </div>
            {onlineDisabled && import.meta.env.MODE === "pages" && (
              <p className="mt-2 text-[10px] text-[#80786d]">
                联机对战请打开游戏服务器地址。
              </p>
            )}
          </div>
        </div>
        <div className="relative order-1 flex min-h-72 flex-col overflow-hidden sm:min-h-80 lg:order-2 lg:min-h-[640px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-[12%] bottom-[16%] rounded-none bg-[radial-gradient(ellipse_at_center,#d8bda480_0%,#d9b2be35_45%,transparent_72%)] blur-2xl"
          />
          <span
            aria-hidden="true"
            className="absolute left-[10%] top-[14%] font-serif text-6xl italic text-[#a44761]/20 lg:text-8xl"
          >
            Resonance.
          </span>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-8 bottom-20 flex items-end justify-center px-3 lg:top-28 lg:bottom-28"
          >
            {/* Fit the entire composition, including the wide poses at both edges. */}
            <svg
              viewBox="0 0 1900 1100"
              preserveAspectRatio="xMidYMid meet"
              className="size-full drop-shadow-[0_16px_20px_#4c35252b]"
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
          <div className="absolute inset-x-0 bottom-0 z-10 px-4 py-3 text-[#565045] sm:px-8 sm:py-4">
            <nav
              className="flex items-center justify-between gap-1"
              aria-label="主视觉乐队"
            >
              {bands.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => setBand(i)}
                  aria-pressed={i === bandIndex}
                  className={`min-h-11 flex-1 rounded-none px-1 text-[10px] font-semibold transition sm:text-xs ${i === bandIndex ? "bg-[#a44761]/10 text-[#8f354e]" : "text-[#80786d] hover:bg-[#30251a]/5 hover:text-[#211f1a]"}`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2  px-5 py-4 text-[9px] font-bold tracking-[.15em] sm:px-10 lg:px-14">
        <span>
          <span className="mr-2 text-[#946b2a]">✦</span>{" "}
          {assets.characters.length} FIGHTERS / {assets.stages.length} STAGES /
          ONE SPOTLIGHT
        </span>
        <span className="text-[#80786d]">
          BAND BATTLE PROJECT — 非官方同人作品
        </span>
      </footer>
    </section>
  );
}
