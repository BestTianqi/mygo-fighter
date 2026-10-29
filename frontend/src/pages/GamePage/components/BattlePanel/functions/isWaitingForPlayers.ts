import type { GameView } from "../../../objects/GameView";

export function isWaitingForPlayers(view: GameView) {
  return (
    !!view.network.room &&
    (view.network.status !== "playing" ||
      !view.network.room.players.every(
        (player) => player?.connected && player.loaded,
      ))
  );
}
