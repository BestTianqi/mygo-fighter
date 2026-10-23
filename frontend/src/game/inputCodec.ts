import { actions, type Input } from "./objects/Input";
/** False buttons and zero counters are implicit. Keep captured gestures, including neutral {}. */
export function compactInput(input: Input): Input {
  const pressIds = Object.fromEntries(
    Object.entries(input.pressIds ?? {}).filter(([, value]) => value > 0),
  );
  const pressDirections = Object.fromEntries(
    Object.entries(input.pressDirections ?? {})
      .filter(([key]) => (pressIds[key] ?? 0) > 0)
      .map(([key, direction]) => [
        key,
        Object.fromEntries(
          Object.entries(direction).filter(([, value]) => value === true),
        ),
      ]),
  );
  return {
    unified: true,
    ...Object.fromEntries(
      actions.filter((action) => input[action]).map((action) => [action, true]),
    ),
    ...(input.touchLight ? { touchLight: true } : {}),
    ...(Object.keys(pressIds).length ? { pressIds } : {}),
    ...(Object.keys(pressDirections).length ? { pressDirections } : {}),
  };
}
