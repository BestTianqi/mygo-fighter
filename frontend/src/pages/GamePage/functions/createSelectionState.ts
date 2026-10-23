import type {
  Format,
  MatchConfig,
  Mode,
} from "../../../game/objects/MatchOptions";
type Settings = MatchConfig["settings"];
interface Seed {
  mode?: Mode;
  format?: Format;
  teams?: number[][];
  characters?: number[];
  settings?: Partial<Settings>;
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
  const valid = (id: unknown): id is number =>
    Number.isInteger(id) && Number(id) >= 0 && Number(id) < rosterSize;
  const count = () => (format === "3v3" ? 3 : 1);
  function nextEmpty() {
    for (let side = 0; side < 2; side++)
      for (let slot = 0; slot < count(); slot++) {
        if (teams[side][slot] === null) {
          active = [side, slot];
          return;
        }
      }
  }
  function resize() {
    teams = teams.map((team) =>
      Array.from({ length: count() }, (_, i) => team[i] ?? null),
    );
    active = [0, 0];
    nextEmpty();
  }
  return {
    open(options: Seed = {}) {
      settings = { ...defaults, ...options.settings };
      mode = options.mode ?? "cpu";
      format = mode !== "practice" && options.format === "3v3" ? "3v3" : "1v1";
      teams = [0, 1].map((side) => {
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
    },
    selectSlot(side: number, slot: number) {
      if (
        (side === 0 || side === 1) &&
        Number.isInteger(slot) &&
        slot >= 0 &&
        slot < count()
      )
        active = [side, slot];
    },
    clearSlot(side: number, slot: number) {
      if (
        (side !== 0 && side !== 1) ||
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= count()
      )
        return;
      teams[side][slot] = null;
      active = [side, slot];
    },
    pick(id: number) {
      if (
        !valid(id) ||
        teams[active[0]].some((pick, slot) => pick === id && slot !== active[1])
      )
        return false;
      teams[active[0]][active[1]] = id;
      nextEmpty();
      return true;
    },
    setFormat(value: Format) {
      format = mode !== "practice" && value === "3v3" ? "3v3" : "1v1";
      resize();
    },
    setMode(value: Mode) {
      mode = value;
      if (mode === "practice") {
        format = "1v1";
        resize();
      }
    },
    setSettings(changes: Partial<Settings>) {
      settings = { ...settings, ...changes };
    },
    isComplete() {
      return teams.every((team) => team.every(valid));
    },
    snapshot() {
      return {
        mode,
        format,
        characters: teams.map((team) => team[0]),
        teams: teams.map((team) => [...team]),
        active: [...active],
        settings: { ...settings },
      };
    },
  };
}
export type SelectionSnapshot = ReturnType<
  ReturnType<typeof createSelectionState>["snapshot"]
>;
