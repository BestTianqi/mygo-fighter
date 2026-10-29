import { MOVES } from "../../../../../game/engine";
import type { BattleSceneContext } from "./objects";
export function drawVocalAuras(scene: BattleSceneContext) {
  for (const f of scene.match.fighters)
    if (
      f.character === 2 &&
      !f.penguin &&
      MOVES[f.attack ?? ""]?.tomoriOnly &&
      !MOVES[f.attack ?? ""]?.nativeOnly &&
      !f.stun &&
      scene.match.phase === "fighting"
    ) {
      const t = f.attackMs;
      scene.ctx.save();
      scene.ctx.translate(f.x, 438 - f.y);
      scene.ctx.scale(f.facing, 1);
      scene.ctx.strokeStyle = "#bcd7ec";
      scene.ctx.lineWidth = 1.5;
      scene.ctx.globalAlpha = 0.35;
      const pulse = (t % 190) / 190;
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        12 + pulse * 18,
        -178,
        14 + pulse * 12,
        20 + pulse * 15,
        0,
        -1.1,
        1.1,
      );
      scene.ctx.stroke();
      if (f.attack === "tomoriChorus") {
        scene.ctx.strokeStyle = "#d9b9d8";
        scene.ctx.beginPath();
        scene.ctx.ellipse(0, -3, 40 + pulse * 10, 8, 0, 0, Math.PI * 2);
        scene.ctx.stroke();
      }
      scene.ctx.restore();
    }
  for (const f of scene.match.fighters)
    if (scene.match.phase === "fighting" && !f.stun && f.penguin) {
      scene.ctx.save();
      scene.ctx.translate(f.x, 438 - f.y);
      scene.ctx.strokeStyle = "#fff0c7";
      scene.ctx.lineWidth = 2;
      if (f.penguin.ms > 19880) {
        const t = (20000 - f.penguin.ms) / 120;
        scene.ctx.globalAlpha = Math.sin(t * Math.PI) * 0.7;
        scene.ctx.beginPath();
        scene.ctx.ellipse(0, -100, 55 + t * 30, 105, 0, 0, Math.PI * 2);
        scene.ctx.stroke();
      } else if (f.attack === "penguinCry") {
        scene.ctx.strokeStyle = "#b6e7ff";
        scene.ctx.globalAlpha = 0.45;
        scene.ctx.beginPath();
        scene.ctx.ellipse(0, -100, 57, 85, 0, 0, Math.PI * 2);
        scene.ctx.stroke();
      } else if (
        f.attack === "penguinLaugh" &&
        f.attackMs >= 180 &&
        f.attackMs < 420
      ) {
        const p = (f.attackMs - 180) / 240;
        scene.ctx.globalAlpha = 0.7 * (1 - p);
        scene.ctx.beginPath();
        scene.ctx.ellipse(
          0,
          -90,
          50 + p * 170,
          35 + p * 110,
          0,
          0,
          Math.PI * 2,
        );
        scene.ctx.stroke();
      } else if (
        f.attack === "penguinHey" &&
        f.attackMs >= 100 &&
        f.attackMs < 320
      ) {
        scene.ctx.scale(f.facing, 1);
        scene.ctx.globalAlpha = Math.min(1, (320 - f.attackMs) / 180);
        scene.ctx.beginPath();
        scene.ctx.ellipse(115, -105, 55, 40, 0, -1.4, 1.4);
        scene.ctx.stroke();
        scene.ctx.fillStyle = "#e6f7ff";
        scene.ctx.font = "bold 22px sans-serif";
        scene.ctx.fillText("hey?", 65, -130);
      } else if (
        f.attack === "penguinCall" &&
        f.attackMs >= 120 &&
        f.attackMs < 600
      ) {
        scene.ctx.scale(f.facing, 1);
        scene.ctx.globalAlpha = 0.6;
        const pulse = (f.attackMs % 160) / 160;
        for (let i = 0; i < 3; i++) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(
            45 - i * 25,
            -95,
            35 + pulse * 30,
            65,
            0,
            -1.4,
            1.4,
          );
          scene.ctx.stroke();
        }
      }
      scene.ctx.restore();
    }
}
