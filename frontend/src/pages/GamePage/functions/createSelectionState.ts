import type {
  Format,
  MatchConfig,
  Mode,
} from "../../../game/objects/MatchOptions";
import type { BattleRules } from "../../../game/objects/BattleRules";
import {
  MATCH_FORMATS,
  normalizeBattleRules,
  teamSizeFor,
} from "../../../game/battleRules";
type Settings = MatchConfig["settings"];
interface Seed {
  mode?: Mode;
  format?: Format;
  teams?: number[][];
  characters?: number[];
  settings?: Partial<Settings>;
  rules?: Partial<BattleRules>;
}
export function createSelectionState(rosterSize: number) {
  let mode: Mode = "cpu",
    format: Format = "1v1";
  let teams: (number | null)[][] = [[null], [null]],
    active = [0, 0];
  const defaults: Settings = {
    arena: 0,
    difficulty: 1,
    sound: true,
    terrain: true,
    dummy: "idle",
  };
  let settings = { ...defaults };
  let rules = normalizeBattleRules(undefined, format, rosterSize);
  let bans: number[] = [];
  const valid = (id: unknown): id is number =>
    Number.isInteger(id) && Number(id) >= 0 && Number(id) < rosterSize;
  const count = () => teamSizeFor(format);
  const playerCount = () => (format === "3ffa" ? 3 : 2);
  const banning = () => bans.length < rules.banCount * 2;
  const complete = () => !banning() && teams.every((team) => team.every(valid));
  function nextEmpty() {
    for (let side = 0; side < playerCount(); side++)
      for (let slot = 0; slot < count(); slot++) {
        if (teams[side][slot] === null) {
          active = [side, slot];
          return;
        }
      }
  }
  function resize() {
    teams = Array.from({ length: playerCount() }, (_, side) =>
      Array.from({ length: count() }, (_, i) => teams[side]?.[i] ?? null),
    );
    active = [0, 0];
    nextEmpty();
  }
  function restartDraft() {
    bans = [];
    teams = Array.from({ length: playerCount() }, () =>
      Array(count()).fill(null),
    );
    active = [0, 0];
  }
  return {
    open(options: Seed = {}) {
      settings = { ...defaults, ...options.settings };
      mode = options.mode ?? "cpu";
      format =
        mode !== "practice" && MATCH_FORMATS.includes(options.format as Format)
          ? options.format!
          : "1v1";
      if (format === "3ffa") mode = "cpu";
      rules = normalizeBattleRules(options.rules, format, rosterSize);
      if (mode === "practice" || format === "3ffa") rules.banCount = 0;
      bans = [];
      teams = Array.from({ length: playerCount() }, (_, side) => {
        const seen = new Set<number>();
        return Array.from({ length: count() }, (_, slot) => {
          const id = options.teams?.[side]?.[slot];
          if (!valid(id) || seen.has(id)) return null;
          seen.add(id);
          return id;
        });
      });
      active = [0, 0];
      nextEmpty();
      if (rules.banCount > 0) restartDraft();
    },
    selectSlot(side: number, slot: number) {
      if (rules.banCount > 0) return;
      if (
        Number.isInteger(side) &&
        side >= 0 &&
        side < playerCount() &&
        Number.isInteger(slot) &&
        slot >= 0 &&
        slot < count()
      )
        active = [side, slot];
    },
    clearSlot(side: number, slot: number) {
      if (rules.banCount > 0) return;
      if (
        !Number.isInteger(side) ||
        side < 0 ||
        side >= playerCount() ||
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= count()
      )
        return;
      teams[side][slot] = null;
      active = [side, slot];
    },
    pick(id: number) {
      if (!valid(id) || bans.includes(id)) return false;
      if (banning()) {
        bans.push(id);
        active = [bans.length % 2, 0];
        return true;
      }
      if (
        rules.banCount > 0 &&
        (complete() || teams.some((team) => team.includes(id)))
      )
        return false;
      if (
        !valid(id) ||
        teams[active[0]].some((pick, slot) => pick === id && slot !== active[1])
      )
        return false;
      teams[active[0]][active[1]] = id;
      if (rules.banCount > 0) {
        const side = 1 - active[0];
        const slot = teams[side].findIndex((pick) => pick === null);
        active = [side, Math.max(0, slot)];
      } else nextEmpty();
      return true;
    },
    setFormat(value: Format) {
      format =
        mode !== "practice" && MATCH_FORMATS.includes(value) ? value : "1v1";
      if (format === "3ffa") mode = "cpu";
      const wasDraft = rules.banCount > 0;
      rules = normalizeBattleRules(rules, format, rosterSize);
      if (format === "3ffa") rules.banCount = 0;
      resize();
      if (wasDraft || rules.banCount > 0) restartDraft();
    },
    setMode(value: Mode) {
      mode = format === "3ffa" && value === "duel" ? "cpu" : value;
      if (mode === "practice") {
        format = "1v1";
        rules.banCount = 0;
        bans = [];
        resize();
      }
    },
    setSettings(changes: Partial<Settings>) {
      settings = { ...settings, ...changes };
    },
    setRules(changes: Partial<BattleRules>) {
      const previousBanCount = rules.banCount;
      rules = normalizeBattleRules(
        { ...rules, ...changes },
        format,
        rosterSize,
      );
      if (mode === "practice" || format === "3ffa") rules.banCount = 0;
      if (previousBanCount !== rules.banCount) restartDraft();
    },
    restartDraft,
    isComplete() {
      return complete();
    },
    snapshot() {
      return {
        mode,
        format,
        characters: teams.map((team) => team[0]),
        teams: teams.map((team) => [...team]),
        active: [...active],
        settings: { ...settings },
        rules: { ...rules },
        bans: [...bans],
        phase: complete()
          ? ("complete" as const)
          : banning()
            ? ("ban" as const)
            : ("pick" as const),
      };
    },
  };
}
export type SelectionSnapshot = ReturnType<
  ReturnType<typeof createSelectionState>["snapshot"]
>;
