/** Numeric IDs remain compatible with saved local match settings. */
export const CPU_DIFFICULTIES = [
  {
    id: 0,
    label: "轻松",
    reaction: 440,
    jitter: 160,
    guard: 0.2,
    combo: 0,
    precision: 0,
  },
  {
    id: 1,
    label: "标准",
    reaction: 260,
    jitter: 160,
    guard: 0.55,
    combo: 0,
    precision: 0,
  },
  {
    id: 2,
    label: "认真",
    reaction: 150,
    jitter: 160,
    guard: 0.8,
    combo: 0,
    precision: 0,
  },
  {
    id: 3,
    label: "专家",
    reaction: 105,
    jitter: 70,
    guard: 0.85,
    combo: 0.55,
    precision: 18,
  },
  {
    id: 4,
    label: "大师",
    reaction: 65,
    jitter: 45,
    guard: 0.94,
    combo: 0.8,
    precision: 8,
  },
  {
    id: 5,
    label: "噩梦",
    reaction: 35,
    jitter: 25,
    guard: 0.98,
    combo: 0.98,
    precision: 2,
  },
] as const;

export function cpuDifficulty(level: number) {
  return CPU_DIFFICULTIES[
    Number.isFinite(level) ? Math.max(0, Math.min(5, Math.floor(level))) : 1
  ];
}
