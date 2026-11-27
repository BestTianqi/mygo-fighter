import { useState } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import type { GameRuntime } from "../runtime/GameRuntime";
import type { GameView } from "../objects/GameView";
import { publicGameURL } from "../functions/publicGameURL";
import { onlineLink } from "../functions/onlineLinks";
import { ROSTER } from "../../../game/engine";

const bands = [
  { name: "MyGO!!!!!", ids: [1, 0, 2, 3, 4] },
  { name: "Ave Mujica", ids: [5, 7, 6, 8, 9] },
  { name: "夢限大 MewType", ids: [11, 12, 10, 13, 14] },
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
  const [bandIndex, setBandIndex] = useState(0);
  const band = bands[bandIndex];
  const resumable = ["ready", "fighting", "roundOver"].includes(view.phase);
  const modes = [
    { label: "本地双人", run: () => runtime?.begin("duel") },
    { label: "车轮战", run: () => runtime?.begin("cpu", "3v3") },
    { label: "三人混战", run: () => runtime?.begin("cpu", "3ffa") },
    { label: "自由练习", run: () => runtime?.begin("practice") },
    {
      label: "联机对战",
      run: () =>
        import.meta.env.MODE === "pages"
          ? location.assign(onlineLink(publicGameURL))
          : runtime?.openLobby(),
    },
  ];
  return (
    <section aria-label="主菜单" className="cabinet-menu">
      <img
        aria-hidden="true"
        className="cabinet-backdrop"
        alt=""
        src={
          assets.backgrounds[
            Math.max(
              0,
              assets.stages.findIndex((s) => s.id === "theater"),
            )
          ]
        }
      />
      <header className="cabinet-top">
        <span className="cabinet-brand">
          MyGO!!!!! <b>FIGHTER</b>
        </span>
        <nav aria-label="游戏帮助">
          <button
            disabled={!runtime}
            onClick={() => runtime?.showDialog("help")}
          >
            操作说明
          </button>
          <button
            disabled={!runtime}
            onClick={() => runtime?.showDialog("onlineGuide")}
          >
            联机教程
          </button>
        </nav>
      </header>
      <div className="cabinet-hero">
        <div className="cabinet-mode">
          <h1 aria-label="MyGO!!!!! FIGHTER 武道馆当然要比武">
            <span>MyGO!!!!!</span>
            <strong>FIGHTER</strong>
          </h1>
          <p className="cabinet-subtitle">武道馆当然要比武</p>
          <div className="cabinet-actions">
            {resumable && <button onClick={onResume}>继续对战</button>}
            <button
              className="cabinet-start"
              disabled={!runtime}
              onClick={() => runtime?.begin("cpu")}
            >
              开始对战 <span aria-hidden="true">↗</span>
            </button>
            <div className="cabinet-modes">
              {modes.map((m) => (
                <button key={m.label} disabled={!runtime} onClick={m.run}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="cabinet-band">
          <div
            key={band.name}
            className="band-panels"
            aria-label={band.name + " 全员"}
          >
            {band.ids.map((id) => (
              <div className="band-panel" data-character={id} key={id}>
                <img
                  src={
                    bandPortrait(assets, id, "stage")?.portrait ??
                    assets.characters[id].portrait
                  }
                  alt={ROSTER[id].name}
                />
              </div>
            ))}
          </div>
          <nav aria-label="主视觉乐队" className="band-switch">
            {bands.map((item, i) => (
              <button
                key={item.name}
                aria-pressed={bandIndex === i}
                onClick={() => setBandIndex(i)}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <footer className="cabinet-credit">非官方同人格斗游戏</footer>
    </section>
  );
}
