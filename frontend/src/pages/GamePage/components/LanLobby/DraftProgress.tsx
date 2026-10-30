import { bandPortrait } from "../../../../assets/bandArt";
import type { Assets } from "../../../../assets/objects/Assets";
import { Button } from "../../../../components/ui/Button";
import { ROSTER } from "../../../../game/engine";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function DraftProgress({
  model,
  assets,
}: {
  model: Pick<
    LanLobbyModel,
    "draft" | "rules" | "side" | "locked" | "restartDraft"
  >;
  assets: Assets;
}) {
  const { draft, rules, side, locked } = model;
  if (!draft) return null;
  return (
    <section
      aria-label="禁选进度"
      className="mb-3 flex flex-wrap items-center justify-between gap-3 bg-void p-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-muted">
          {draft.phase === "ban"
            ? "正在禁用"
            : draft.phase === "pick"
              ? "正在选人"
              : "禁选完成"}{" "}
          · 先禁后选
        </span>
        {Array.from({ length: rules.banCount * 2 }, (_, banIndex) => {
          const banSide = banIndex % 2;
          const id = draft.bans[banIndex];
          return (
            <div key={banIndex} className="flex items-center gap-2 text-xs">
              <span className={banSide === 0 ? "text-ember" : "text-silver"}>
                {banSide + 1}P · {Math.floor(banIndex / 2) + 1}
              </span>
              {id === undefined ? (
                <span className="grid size-9 place-items-center rounded-none bg-panel text-muted">
                  —
                </span>
              ) : (
                <img
                  src={
                    bandPortrait(assets, id)?.face ??
                    assets.characters[id].portrait
                  }
                  alt=""
                  className="size-9 rounded-none object-cover object-center grayscale"
                />
              )}
              <span className="text-[11px] text-muted">
                {id === undefined ? "待禁用" : ROSTER[id].name}
              </span>
            </div>
          );
        })}
      </div>
      {side === 0 && (
        <Button
          disabled={locked}
          onClick={model.restartDraft}
          className="text-xs"
        >
          重新禁选
        </Button>
      )}
    </section>
  );
}
