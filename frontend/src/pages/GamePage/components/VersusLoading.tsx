import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import { ROSTER } from "../../../game/engine";
import type { MatchConfig } from "../../../game/objects/MatchOptions";

export function VersusLoading({
  assets,
  config,
  progress,
  onBack,
}: {
  assets: Assets;
  config: MatchConfig;
  progress: number;
  onBack: () => void;
}) {
  const arena = config.settings.arena;
  return (
    <section
      className="versus-screen"
      aria-label="准备登台"
      data-sides={config.characters.length}
    >
      <img className="versus-map" src={assets.backgrounds[arena]} alt="" />
      <div className="versus-teams">
        {config.characters.map((id, side) => (
          <div className="versus-player" key={side}>
            <img
              alt=""
              src={
                bandPortrait(assets, id)?.portrait ??
                assets.characters[id].portrait
              }
            />
            <div>
              <b>
                {side === 0 || config.mode === "duel"
                  ? side + 1 + "P"
                  : config.mode === "practice"
                    ? "练习对手"
                    : "CPU " + side}
              </b>
              <small className="versus-en" aria-hidden="true">
                {ROSTER[id].en}
              </small>
              <h2>{ROSTER[id].name}</h2>
              {(config.teams?.[side]?.length ?? 0) > 1 && (
                <p>
                  {config
                    .teams![side].slice(1)
                    .map((p) => ROSTER[p].name)
                    .join(" / ")}
                </p>
              )}
            </div>
          </div>
        ))}
        <strong className="versus-mark" aria-hidden="true">
          {config.characters.length === 3 ? "3 WAY" : "VS"}
        </strong>
      </div>
      <div className="versus-progress">
        <div>
          <strong>{assets.stages[arena].name}</strong>
          <span role="status">准备登台 · {progress}%</span>
        </div>
        <progress aria-label="对战加载进度" value={progress} max={100} />
        <button onClick={onBack}>返回主菜单</button>
      </div>
    </section>
  );
}
