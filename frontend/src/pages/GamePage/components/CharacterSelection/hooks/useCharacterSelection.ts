import { useState } from "react";
import { teamSizeFor } from "../../../../../game/battleRules";
import { ROSTER } from "../../../../../game/engine";
import type { BattleRules } from "../../../../../game/objects/BattleRules";
import type {
  Format,
  MatchConfig,
  Mode,
} from "../../../../../game/objects/MatchOptions";
import { createSelectionState } from "../stores/createSelectionState";

export function useCharacterSelection(
  config: MatchConfig,
  onStart: (config: MatchConfig) => void,
) {
  const [controller] = useState(() => {
    const state = createSelectionState(ROSTER.length);
    state.open(config);
    return state;
  });
  const [selection, setSelection] = useState(controller.snapshot());
  const [preview, setPreview] = useState(0);
  const [error, setError] = useState("");
  const update = (action: () => unknown) => {
    action();
    setSelection(controller.snapshot());
    setError("");
  };
  const complete = controller.isComplete();
  const brawl = selection.format === "3ffa";
  const labels = selection.teams.map((_, side) =>
    side === 0
      ? "1P"
      : selection.mode === "duel"
        ? `${side + 1}P`
        : `CPU ${side}`,
  );
  function confirm() {
    if (!complete) return;
    const teams = selection.teams as number[][];
    onStart({
      mode: selection.mode,
      format: selection.format,
      characters: teams.map((team) => team[0]),
      ...(teamSizeFor(selection.format) > 1 ? { teams } : {}),
      settings: selection.settings,
      rules: selection.rules,
    });
  }
  return {
    selection,
    preview,
    error,
    complete,
    brawl,
    labels,
    setPreview,
    confirm,
    setMode: (mode: Mode) => update(() => controller.setMode(mode)),
    setFormat: (format: Format) => update(() => controller.setFormat(format)),
    setSettings: (settings: Partial<MatchConfig["settings"]>) =>
      update(() => controller.setSettings(settings)),
    setRules: (rules: Partial<BattleRules>) =>
      update(() => controller.setRules(rules)),
    restartDraft: () => update(() => controller.restartDraft()),
    selectSlot: (side: number, slot: number) => {
      const id = selection.teams[side][slot];
      if (id !== null) setPreview(id);
      update(() => controller.selectSlot(side, slot));
    },
    clearSlot: (side: number, slot: number) =>
      update(() => controller.clearSlot(side, slot)),
    chooseCharacter: (id: number) => {
      setPreview(id);
      setError(
        controller.pick(id) ? "" : "请选择未禁用且未被当前阵容占用的角色。",
      );
      setSelection(controller.snapshot());
    },
  };
}
export type CharacterSelectionModel = ReturnType<typeof useCharacterSelection>;
