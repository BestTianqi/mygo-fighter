import { useState, type ReactNode } from "react";
import { bandPortrait } from "../../../assets/bandArt";
import type { Assets } from "../../../assets/objects/Assets";
import { schemeFor } from "../../../game/controls";
import { ROSTER, MOVES } from "../../../game/engine";

function FighterWing({
  assets,
  id,
  label,
  side,
  active,
  selected,
}: {
  assets: Assets;
  id: number | null;
  label: string;
  side: number;
  active: boolean;
  selected: boolean;
}) {
  const [stage, setStage] = useState(false);
  const profile = id === null ? null : ROSTER[id];
  const scheme =
    id === null ? null : schemeFor({ character: id, stageForm: stage });
  return (
    <aside
      className="fighter-wing"
      data-side={side}
      data-active={active}
      data-empty={id === null}
      aria-label={label + " · " + (profile?.name ?? "待选")}
    >
      <div className="wing-image">
        {id !== null ? (
          <img
            src={
              bandPortrait(assets, id, stage ? "stage" : "normal")?.portrait ??
              assets.characters[id].portrait
            }
            alt=""
          />
        ) : (
          <span aria-hidden="true">?</span>
        )}
      </div>
      <b className="wing-side">
        {label}
        {profile && <small>{selected ? "已选" : "预览"}</small>}
      </b>
      <div className="wing-name">
        {profile && <small aria-hidden="true">{profile.en}</small>}
        <h2>{profile?.name ?? "等待选手"}</h2>
        {profile && (
          <p>
            {profile.role} / {profile.archetype}
          </p>
        )}
      </div>
      {active && id !== null && scheme && (
        <div className="wing-tools">
          {assets.mujicaPortraits[id] && (
            <button
              type="button"
              aria-label="切换角色形态预览"
              aria-pressed={stage}
              onClick={() => setStage(!stage)}
            >
              {stage ? "演出服" : "常态"} ⇄
            </button>
          )}
          <details>
            <summary>招式</summary>
            <dl>
              {[...scheme.base, scheme.super].map(
                (key, i) =>
                  key && (
                    <div key={i}>
                      <dt>{["U", "I", "O", "P"][i]}</dt>
                      <dd>{MOVES[key]?.name}</dd>
                    </div>
                  ),
              )}
            </dl>
          </details>
        </div>
      )}
    </aside>
  );
}

export function FighterSelect({
  assets,
  teams,
  labels,
  previewSide,
  preview,
  children,
}: {
  assets: Assets;
  teams: (number | null)[][];
  labels: string[];
  previewSide: number | null;
  preview: number;
  children: ReactNode;
}) {
  return (
    <div className="fighter-select" data-sides={teams.length}>
      {teams.map((team, side) => {
        const current =
          side === previewSide
            ? preview
            : (team.reduce<number | null>((last, id) => id ?? last, null) ??
              null);
        return (
          <FighterWing
            key={side + "/" + current}
            assets={assets}
            id={current}
            label={labels[side]}
            side={side}
            selected={current !== null && team.includes(current)}
            active={side === previewSide}
          />
        );
      })}
      <div className="select-console">{children}</div>
    </div>
  );
}
