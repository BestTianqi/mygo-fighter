import { ROSTER } from "../../../../game/combatData";
import type { SuperCast } from "../../../../game/objects/SuperCast";

type Motif =
  | "spark"
  | "petal"
  | "wave"
  | "strings"
  | "drum"
  | "keys"
  | "crescent"
  | "shards"
  | "camera"
  | "ink"
  | "snow";
type Style = { motif: Motif; color: string; count: number };

const styles: Record<string, Style> = {
  super: { motif: "spark", color: "#ffcf61", count: 9 },
  soyoSuper: { motif: "petal", color: "#f9d398", count: 11 },
  tomoriSuper: { motif: "wave", color: "#a7b5fb", count: 7 },
  penguinSuper: { motif: "snow", color: "#d0f5ff", count: 10 },
  ranaSuper: { motif: "strings", color: "#afe082", count: 6 },
  rikiSuper: { motif: "drum", color: "#dfadf6", count: 8 },
  mujica_5_normal_super: { motif: "strings", color: "#83c9b9", count: 4 },
  mujica_5_stage_super: { motif: "strings", color: "#49c9b2", count: 8 },
  mujica_6_normal_super: { motif: "keys", color: "#abbefc", count: 12 },
  mujica_6_stage_super: { motif: "keys", color: "#e0bcfc", count: 16 },
  mujica_7_normal_super: { motif: "crescent", color: "#f2deb3", count: 5 },
  mujica_7_stage_super: { motif: "crescent", color: "#e29bea", count: 7 },
  mujica_8_normal_super: { motif: "petal", color: "#b4d39c", count: 7 },
  mujica_8_stage_super: { motif: "shards", color: "#9ae593", count: 9 },
  mujica_9_normal_super: { motif: "camera", color: "#edacd5", count: 3 },
  mujica_9_stage_super: { motif: "camera", color: "#fb80c5", count: 5 },
  mewtype_10_virtual_super: { motif: "spark", color: "#f4a975", count: 13 },
  mewtype_11_virtual_super: { motif: "drum", color: "#9dc9fc", count: 6 },
  mewtype_12_virtual_super: { motif: "ink", color: "#d2a3f4", count: 9 },
  mewtype_13_virtual_super: { motif: "strings", color: "#e8b3e9", count: 5 },
  mewtype_14_virtual_super: { motif: "wave", color: "#fbaea8", count: 9 },
  mewtype_15_virtual_super: { motif: "camera", color: "#c8b5fc", count: 7 },
};
export const superStyle = (cast: SuperCast): Style =>
  styles[cast.attack] ?? {
    motif: "wave",
    color: ROSTER[cast.character].color,
    count: 7,
  };

function trace(ctx: CanvasRenderingContext2D, motif: Motif, r: number) {
  switch (motif) {
    case "spark":
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
      ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
      ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
      ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
      break;
    case "petal":
      ctx.ellipse(0, 0, r, r * 0.38, -0.72, 0, 2 * Math.PI);
      break;
    case "wave":
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r * 0.45, -r * 1.7, r * 0.45, r * 1.7, r, 0);
      break;
    case "strings":
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(-r, i * 3);
        ctx.quadraticCurveTo(0, i * 3 - r * 0.9, r, i * 3);
      }
      break;
    case "drum":
      ctx.ellipse(0, 0, r, r * 0.45, 0, 0, 2 * Math.PI);
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r, r * 0.42);
      ctx.ellipse(0, r * 0.42, r, r * 0.45, 0, 0, Math.PI);
      ctx.lineTo(-r, 0);
      break;
    case "keys":
      ctx.rect(-r * 0.36, -r, r * 0.72, r * 2);
      ctx.rect(-r * 0.12, -r, r * 0.24, r * 0.88);
      break;
    case "crescent":
      ctx.arc(0, 0, r, -1.3, 1.3);
      ctx.quadraticCurveTo(r * 0.51, 0, r * Math.cos(1.3), -r * Math.sin(1.3));
      break;
    case "shards":
      ctx.moveTo(-r * 0.7, r);
      ctx.lineTo(r * 0.12, -r);
      ctx.lineTo(r * 0.7, -r * 0.65);
      ctx.closePath();
      break;
    case "camera":
      ctx.rect(-r, -r * 0.65, r * 2, r * 1.3);
      ctx.moveTo(r * 0.36, 0);
      ctx.arc(0, 0, r * 0.36, 0, 2 * Math.PI);
      break;
    case "ink":
      ctx.moveTo(-r, -r * 0.38);
      ctx.lineTo(r * 0.7, -r * 0.67);
      ctx.lineTo(r, r * 0.2);
      ctx.lineTo(-r * 0.5, r * 0.48);
      ctx.closePath();
      break;
    case "snow":
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * r,
          y = Math.sin(angle) * r;
        ctx.moveTo(-x, -y);
        ctx.lineTo(x, y);
      }
      break;
  }
}

export function drawSuperOrnament(
  ctx: CanvasRenderingContext2D,
  style: Style,
  center: number,
  y: number,
  span: number,
  age: number,
  progress: number,
) {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = style.color;
  ctx.globalAlpha *= 0.7;
  ctx.lineWidth = 1.25;
  ctx.fillRect(center - span / 2, y + 15, span * progress, 2);
  for (let i = 0; i < style.count; i++) {
    const phase = age / 340 + i * 0.85;
    const x = center + ((i + 0.5) / style.count - 0.5) * span;
    const radius = 7 + 2.5 * Math.sin(phase);
    ctx.save();
    ctx.translate(x, y - 3 + 3 * Math.sin(phase));
    ctx.beginPath();
    trace(ctx, style.motif, radius);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
