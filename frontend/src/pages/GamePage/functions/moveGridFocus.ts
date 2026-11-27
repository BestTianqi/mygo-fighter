import type { KeyboardEvent } from "react";

export function moveGridFocus(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
    return;
  const grid = event.currentTarget;
  const cards = Array.from(grid.querySelectorAll("button"));
  const start = cards.indexOf(event.target as HTMLButtonElement);
  if (start < 0) return;
  const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const step = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns,
  }[event.key]!;
  event.preventDefault();
  for (
    let index = start + step;
    index >= 0 && index < cards.length;
    index += step
  ) {
    if (!cards[index].disabled) {
      cards[index].focus();
      break;
    }
  }
}
