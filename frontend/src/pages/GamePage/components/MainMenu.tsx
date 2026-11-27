import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { GameRuntime } from "../runtime/GameRuntime";
import type { GameView } from "../objects/GameView";
import { publicGameURL } from "../functions/publicGameURL";
import { onlineLink } from "../functions/onlineLinks";
import mygoPoster from "../../../../../assets/ui/fight-posters/mygo.webp";
import mujicaPoster from "../../../../../assets/ui/fight-posters/mujica.webp";
import mewPoster from "../../../../../assets/ui/fight-posters/mewtype.webp";

const posters = [
  { name: "MyGO!!!!!", image: mygoPoster, cast: "千早爱音 / 高松灯" },
  { name: "Ave Mujica", image: mujicaPoster, cast: "丰川祥子 / 若叶睦" },
  { name: "夢限大 MewType", image: mewPoster, cast: "薇欧拉 / 仲町阿拉蕾" },
];

function moveMenuFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button:enabled"),
  );
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  buttons[
    (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
      buttons.length
  ].focus();
}

export function MainMenu({
  runtime,
  view,
  onResume,
}: {
  runtime: GameRuntime | null;
  view: GameView;
  onResume: () => void;
}) {
  const [band, setBand] = useState(0);
  const poster = posters[band];
  const firstMode = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (runtime && document.activeElement === document.body)
      firstMode.current?.focus({ preventScroll: true });
  }, [runtime]);
  const modes = [
    ...(["ready", "fighting", "roundOver"].includes(view.phase)
      ? [{ label: "继续对战", en: "RESUME", run: onResume }]
      : []),
    { label: "开始对战", en: "ARCADE", run: () => runtime?.begin("cpu") },
    { label: "本地双人", en: "VERSUS", run: () => runtime?.begin("duel") },
    {
      label: "车轮战",
      en: "TEAM BATTLE",
      run: () => runtime?.begin("cpu", "3v3"),
    },
    {
      label: "三人混战",
      en: "FREE FOR ALL",
      run: () => runtime?.begin("cpu", "3ffa"),
    },
    {
      label: "自由练习",
      en: "TRAINING",
      run: () => runtime?.begin("practice"),
    },
    {
      label: "联机对战",
      en: "ONLINE",
      run: () =>
        import.meta.env.MODE === "pages"
          ? location.assign(onlineLink(publicGameURL))
          : runtime?.openLobby(),
    },
  ];
  return (
    <section className="fight-hub" aria-label="主菜单" data-band={band}>
      <div className="fight-poster" key={poster.name}>
        <img src={poster.image} alt={poster.cast} fetchPriority="high" />
      </div>
      <header className="hub-head">
        <span>
          MODE SELECT <b>模式选择</b>
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
      <div className="hub-play">
        <h1 className="fight-logo" aria-label="MyGO!!!!! FIGHTER">
          <span>MyGO!!!!!</span>
          <strong>FIGHTER</strong>
        </h1>
        <p className="hub-motto">武道馆当然要比武</p>
        <nav
          className="mode-rail"
          aria-label="对战模式"
          onKeyDown={moveMenuFocus}
        >
          {modes.map((m, i) => (
            <button
              className="mode-entry"
              key={m.en}
              disabled={!runtime}
              aria-label={m.label}
              ref={i === 0 ? firstMode : undefined}
              onClick={m.run}
            >
              <span>{m.label}</span>
              <small aria-hidden="true">{m.en}</small>
              <i aria-hidden="true">▸</i>
            </button>
          ))}
        </nav>
      </div>
      <div className="hub-bands">
        <div className="poster-caption">
          <strong>{poster.name}</strong>
          <span>{poster.cast}</span>
        </div>
        <nav aria-label="主视觉乐队">
          {posters.map((p, i) => (
            <button
              key={p.name}
              aria-pressed={i === band}
              onClick={() => setBand(i)}
            >
              {p.name}
            </button>
          ))}
        </nav>
      </div>
      <footer className="hub-foot">非官方同人格斗游戏</footer>
    </section>
  );
}
