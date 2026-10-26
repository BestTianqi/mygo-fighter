import { ROUND_END_TIMING } from "../../../game/engine";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ENTER_MS = 240;
const EXIT_MS = 300;

/** Project the existing round-end clock, so pause and reconnect never replay a cut-in. */
export function finishMotion(
  phaseMs: number,
  winnerSide: number,
  reducedMotion = false,
) {
  const duration = ROUND_END_TIMING.total - ROUND_END_TIMING.knockout;
  const age = duration - phaseMs;
  if (age < 0 || phaseMs <= 0) return null;
  const enter = clamp(age / ENTER_MS);
  const leave = clamp((age - (duration - EXIT_MS)) / EXIT_MS);
  const incoming = (1 - enter) ** 3;
  const outgoing = leave ** 3;
  const direction = winnerSide === 0 ? -1 : 1;
  const reveal = (1 - incoming) * 108;
  return {
    phase: age < ENTER_MS ? "enter" : leave > 0 ? "exit" : "hold",
    opacity: reducedMotion ? 1 : clamp(age / 80) * (1 - leave),
    artX: reducedMotion ? 0 : direction * (incoming * 110 - outgoing * 120),
    artScale: reducedMotion ? 1 : 1 + incoming * 0.04,
    textX: reducedMotion ? 0 : -direction * (incoming * 24 - outgoing * 32),
    textOpacity: reducedMotion ? 1 : clamp((age - 80) / 160),
    clipPath: reducedMotion
      ? "none"
      : winnerSide === 0
        ? `polygon(0 0, ${reveal}% 0, ${reveal - 8}% 100%, 0 100%)`
        : `polygon(${100 - reveal}% 0, 100% 0, 100% 100%, ${108 - reveal}% 100%)`,
  };
}
