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
      className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-none bg-[#30251a]/4 p-2"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] tracking-widest text-[#80786d]">
          BAN / 先禁后选
        </span>
        {Array.from({ length: rules.banCount * 2 }, (_, banIndex) => {
          const banSide = banIndex % 2;
          const id = draft.bans[banIndex];
          return (
            <div key={banIndex} className="flex items-center gap-2 text-xs">
              <span
                className={banSide === 0 ? "text-[#8f354e]" : "text-[#2a5f5a]"}
              >
                {banSide + 1}P · {Math.floor(banIndex / 2) + 1}
              </span>
              {id === undefined ? (
                <span className="grid size-9 place-items-center rounded-none bg-[#30251a]/5 text-[#80786d]">
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
              <span className="text-[10px] text-[#80786d]">
                {id === undefined ? "待禁用" : ROSTER[id].name}
              </span>
            </div>
          );
        })}
      </div>
      {side === 0 && (
        <Button
          tone="light"
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
