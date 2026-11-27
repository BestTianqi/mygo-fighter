import { useState } from "react";
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
  const [step, setStep] = useState<"fighters" | "stage">("fighters");
  const selecting = step === "fighters";
  const advance = () => setStep(selecting ? "stage" : "fighters");
  return (
    <section
      className="draft-screen grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-void text-ivory"
      aria-label="角色选择"
    >
      <SelectionHeader model={model} onBack={onBack} />
      <nav aria-label="对战准备" className="draft-tabs">
        <button aria-pressed={selecting} onClick={() => setStep("fighters")}>
          角色阵容
        </button>
        <button aria-pressed={!selecting} onClick={() => setStep("stage")}>
          场地与规则
        </button>
      </nav>
      <div className="min-h-0 overflow-y-auto overscroll-contain py-4 [scrollbar-width:none] sm:py-5 [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-8">
          {selecting ? (
            <SelectionRoster model={model} assets={assets} />
          ) : (
            <SelectionSettings model={model} assets={assets} />
          )}
        </div>
      </div>
      <SelectionFooter
        selecting={selecting}
        onAdvance={advance}
        model={model}
        stageName={assets.stages[model.selection.settings.arena].name}
      />
    </section>
  );
}
