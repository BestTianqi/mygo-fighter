import type { Assets } from "../../../../assets/objects/Assets";
import type { MatchConfig } from "../../../../game/objects/MatchOptions";
import { useCharacterSelection } from "./hooks/useCharacterSelection";
import { SelectionFooter } from "./SelectionFooter";
import { SelectionHeader } from "./SelectionHeader";
import { SelectionRoster } from "./SelectionRoster";
import { SelectionSettings } from "./SelectionSettings";

export function CharacterSelection({
  assets,
  config,
  onStart,
  onBack,
}: {
  assets: Assets;
  config: MatchConfig;
  onStart: (config: MatchConfig) => void;
  onBack: () => void;
}) {
  const model = useCharacterSelection(config, onStart);
  return (
    <section
      className="mx-auto grid h-dvh max-w-[1600px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#f5f0e5] px-3 sm:px-6"
      aria-label="角色选择"
    >
      <SelectionHeader model={model} onBack={onBack} />
      <div className="min-h-0 overflow-y-auto py-3 [scrollbar-width:thin]">
        <SelectionRoster model={model} assets={assets} />
        <SelectionSettings model={model} assets={assets} />
      </div>
      <SelectionFooter model={model} />
    </section>
  );
}
