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
      className="mx-auto grid h-dvh max-w-[1600px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#f3f7fc] px-3 text-[#101d33] sm:px-6 lg:px-8"
      aria-label="角色选择"
    >
      <SelectionHeader model={model} onBack={onBack} />
      <div className="min-h-0 overflow-y-auto overscroll-contain py-4 [scrollbar-width:thin] sm:py-5">
        <SelectionRoster model={model} assets={assets} />
        <SelectionSettings model={model} assets={assets} />
      </div>
      <SelectionFooter
        model={model}
        stageName={assets.stages[model.selection.settings.arena].name}
      />
    </section>
  );
}
