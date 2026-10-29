import type { Wave } from "../../../../../game/objects/Wave";
import type { ProjectileContext } from "./ProjectileContext";
export function drawPenguinWave(scene: ProjectileContext, w: Wave) {
  scene.ctx.save();
  scene.ctx.translate(w.x, 438 - w.y);
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.globalAlpha = Math.min(1, w.life / 140);
  scene.ctx.strokeStyle = "#fff0c8";
  scene.ctx.fillStyle = "#ecf7ff";
  scene.ctx.lineWidth = 3;
  scene.ctx.shadowColor = "#eac589";
  scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
  for (let i = 0; i < 3; i++) {
    scene.ctx.beginPath();
    scene.ctx.ellipse(
      -i * 11,
      0,
      Math.max(6, w.rx! - i * 5),
      Math.max(8, w.ry! - i * 9),
      0,
      -1.25,
      1.25,
    );
    scene.ctx.stroke();
  }
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.font = 'bold 16px "Microsoft YaHei",sans-serif';
  scene.ctx.textAlign = "center";
  scene.ctx.fillText(
    w.attack === "penguinHey"
      ? "hey?"
      : w.attack === "penguinCall"
        ? "咕嘎！"
        : "呜！",
    0,
    -w.ry! - 8,
  );
  scene.ctx.restore();
}

export function drawVoiceWave(scene: ProjectileContext, w: Wave) {
  const wide = w.attack !== "tomoriNote",
    chorus = w.attack === "tomoriChorus" || w.attack === "tomoriSuper";
  scene.ctx.save();
  scene.ctx.translate(w.x, 438 - w.y);
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.globalAlpha = Math.min(1, w.life / 180);
  scene.ctx.shadowColor = "#a8bfdc";
  scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 12;
  scene.ctx.strokeStyle = chorus ? "#e4c3df" : "#c1deed";
  scene.ctx.fillStyle = "#d5e8f2";
  scene.ctx.lineWidth = chorus ? 3 : 2;
  for (let i = 0; i < (wide ? 3 : 1); i++) {
    scene.ctx.beginPath();
    scene.ctx.ellipse(
      -i * 13,
      0,
      Math.max(8, w.rx! - i * 5),
      w.ry! - i * 9,
      0,
      -1.25,
      1.25,
    );
    scene.ctx.stroke();
  }
  const flutter = Math.sin(w.age * 0.012) * 5;
  scene.ctx.beginPath();
  scene.ctx.ellipse(-5, 9 + flutter, 8, 5, -0.3, 0, Math.PI * 2);
  scene.ctx.fill();
  scene.ctx.beginPath();
  scene.ctx.moveTo(2, 8 + flutter);
  scene.ctx.lineTo(2, -20 + flutter);
  scene.ctx.lineTo(17, -16 + flutter);
  scene.ctx.stroke();
  if (chorus) {
    scene.ctx.beginPath();
    scene.ctx.arc(-18, -18, 3, 0, Math.PI * 2);
    scene.ctx.fill();
  }
  scene.ctx.restore();
}

export function drawSonicWave(scene: ProjectileContext, w: Wave) {
  const rx = w.rx!,
    ry = w.ry!;
  scene.ctx.save();
  scene.ctx.translate(w.x, 438 - w.y);
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.globalAlpha = Math.min(1, w.life / 120);
  const glow = scene.ctx.createRadialGradient(0, 0, 5, 0, 0, ry);
  glow.addColorStop(0, "#fff1fa85");
  glow.addColorStop(0.4, "#f98acb4a");
  glow.addColorStop(1, "#f98acb00");
  scene.ctx.fillStyle = glow;
  scene.ctx.fillRect(-rx * 1.5, -ry, rx * 3, ry * 2);
  scene.ctx.shadowColor = "#ff8dce";
  scene.ctx.shadowBlur = 22;
  for (let i = 0; i < 4; i++) {
    scene.ctx.strokeStyle = ["#fff1fa", "#ff98d0", "#a9e5ff", "#fa8ec7"][i];
    scene.ctx.lineWidth = i ? 2.5 : 5;
    scene.ctx.beginPath();
    scene.ctx.ellipse(
      -i * rx * 0.43,
      0,
      rx * (1 - i * 0.12),
      ry * (1 - i * 0.12),
      0,
      -Math.PI / 2,
      Math.PI / 2,
    );
    scene.ctx.stroke();
  }
  scene.ctx.lineWidth = 2;
  scene.ctx.strokeStyle = "#fff5fd";
  scene.ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const x = -rx * 1.3 + (i / 28) * rx * 2;
    const y =
      Math.sin(i * 1.7 - w.age * 0.025) *
      (8 + Math.sin((i / 28) * Math.PI) * 14);
    if (!i) scene.ctx.moveTo(x, y);
    else scene.ctx.lineTo(x, y);
  }
  scene.ctx.stroke();
  scene.ctx.scale(w.vx > 0 ? 1 : -1, 1);
  scene.ctx.font = '900 italic 21px "Segoe UI",sans-serif';
  scene.ctx.textAlign = "center";
  scene.ctx.lineWidth = 4;
  scene.ctx.strokeStyle = "#48243d";
  scene.ctx.strokeText("TGW!!", 0, -ry - 12);
  scene.ctx.fillStyle = "#ffe8f5";
  scene.ctx.fillText("TGW!!", 0, -ry - 12);
  scene.ctx.restore();
}
