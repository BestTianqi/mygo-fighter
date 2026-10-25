import { MOVES } from "../../../../../game/engine";
import { drawMiyakoSkill } from "../drawMiyakoSkills";
import { drawNonokaSkill } from "../drawNonokaSkills";
import { drawRitsuSkill } from "../drawRitsuSkills";
import { drawYunoSkill } from "../drawYunoSkills";
import type { BattleSceneContext } from "./objects";
export function drawOffenseEffect(scene: BattleSceneContext, side: number) {
  const f = scene.match.fighters[side],
    t = f.attackMs;
  if (
    scene.match.phase !== "fighting" ||
    f.stun ||
    !["thrust", "rush", "dive"].includes(f.attack ?? "")
  )
    return;
  scene.ctx.save();
  scene.ctx.translate(f.x, 438 - f.y);
  scene.ctx.scale(f.facing, 1);
  scene.ctx.strokeStyle = "#ffc0e1";
  scene.ctx.shadowColor = "#ff87c4";
  scene.ctx.shadowBlur = 13;
  scene.ctx.lineWidth = 2;
  if (f.attack === "thrust" && t < 280) {
    for (let i = 0; i < 5; i++) {
      const y = -45 - i * 30;
      scene.ctx.globalAlpha = 0.65 - i * 0.08;
      scene.ctx.beginPath();
      scene.ctx.moveTo(-80 - i * 6, y);
      scene.ctx.lineTo(35 - i * 6, y - 4);
      scene.ctx.stroke();
    }
    scene.ctx.globalAlpha = 0.8;
    scene.ctx.fillStyle = "#fff0f9";
    scene.ctx.beginPath();
    scene.ctx.moveTo(80, -130);
    scene.ctx.lineTo(105, -112);
    scene.ctx.lineTo(80, -94);
    scene.ctx.lineTo(88, -112);
    scene.ctx.closePath();
    scene.ctx.fill();
  } else if (f.attack === "rush" && t < 650) {
    const beat = t < 250 ? 0 : t < 460 ? 1 : 2,
      pulse = MOVES.rush.pulses![beat];
    const strength = Math.max(0.15, 1 - Math.abs(t - pulse.at) / 140);
    scene.ctx.globalAlpha = strength;
    scene.ctx.lineWidth = 3 + beat;
    scene.ctx.beginPath();
    scene.ctx.ellipse(
      55,
      -110,
      40 + beat * 8,
      60 + beat * 9,
      -0.4 + beat * 0.25,
      -1.4,
      1.3,
    );
    scene.ctx.stroke();
    scene.ctx.scale(f.facing, 1);
    scene.ctx.fillStyle = "#ffdbed";
    scene.ctx.textAlign = "center";
    scene.ctx.font = 'bold italic 12px "Segoe UI",sans-serif';
    scene.ctx.fillText(beat + 1 + " / 3 BEAT", 0, -245);
  } else if (f.attack === "dive") {
    scene.ctx.lineWidth = 3;
    scene.ctx.globalAlpha = 0.75;
    for (let i = 0; i < 4; i++) {
      scene.ctx.beginPath();
      scene.ctx.moveTo(-65 + i * 19, -210 - i * 4);
      scene.ctx.lineTo(-25 + i * 20, -110 + i * 10);
      scene.ctx.stroke();
    }
    scene.ctx.lineWidth = 4;
    scene.ctx.strokeStyle = "#c8edff";
    scene.ctx.beginPath();
    scene.ctx.arc(25, -25, 35, -0.8, 1.2);
    scene.ctx.stroke();
  }
  scene.ctx.restore();
}

export function drawSuperAura(scene: BattleSceneContext) {
  const view = scene.camera.viewport();
  for (const f of scene.match.fighters) {
    if (f.hardStun > 0 && scene.match.phase === "fighting") {
      scene.ctx.save();
      scene.ctx.translate(f.x, 438 - f.y - 245);
      scene.ctx.strokeStyle = "#ffe1a0";
      scene.ctx.fillStyle = "#fff0cb";
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      scene.ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.font = "bold 13px sans-serif";
      scene.ctx.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        const a = scene.state.visualTime / 250 + (i * Math.PI * 2) / 3;
        scene.ctx.fillText("✦", Math.cos(a) * 30, Math.sin(a) * 9 + 4);
      }
      const sealed = scene.match.fighters.some(
        (source) => source.binding?.target === scene.match.fighters.indexOf(f),
      );
      scene.ctx.fillText(
        sealed ? "封印锁定" : "硬直 " + (f.hardStun / 1000).toFixed(1) + "s",
        0,
        -15,
      );
      scene.ctx.restore();
    }
    if (f.soyoSuper && scene.match.phase === "fighting") {
      const cast = f.soyoSuper,
        age = MOVES.soyoSuper.duration - cast.ms - MOVES.soyoSuper.start;
      if (age <= 700) {
        scene.ctx.save();
        scene.ctx.translate(cast.x, 438 - cast.y);
        scene.ctx.strokeStyle = "#ffe3a6";
        scene.ctx.fillStyle = "#ffe3a612";
        scene.ctx.shadowColor = "#e8ac52";
        scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 14;
        scene.ctx.globalAlpha = cast.released
          ? Math.min(1, Math.max(0, (700 - age) / 250))
          : 0.35;
        const radius = cast.released
          ? Math.max(1, cast.radius)
          : 30 + Math.sin(scene.state.visualTime / 90) * 5;
        scene.ctx.lineWidth = 5;
        scene.ctx.beginPath();
        scene.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        scene.ctx.fill();
        scene.ctx.stroke();
        scene.ctx.globalAlpha *= 0.5;
        scene.ctx.lineWidth = 2;
        scene.ctx.beginPath();
        scene.ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
        scene.ctx.stroke();
        scene.ctx.restore();
      }
    }
    if (f.attack !== "super" || scene.match.phase !== "fighting") continue;
    const t = f.attackMs,
      intensity = Math.min(1, t / 500) * Math.min(1, (2600 - t) / 400);
    scene.ctx.save();
    scene.ctx.fillStyle = `rgba(12,6,24,${0.4 * intensity})`;
    scene.ctx.fillRect(view.left, view.top, view.width, view.height);
    const glow = scene.ctx.createRadialGradient(
      f.x,
      438 - f.y - 160,
      15,
      f.x,
      438 - f.y - 160,
      370,
    );
    glow.addColorStop(0, "#ffbcdf70");
    glow.addColorStop(0.65, "#e54da42a");
    glow.addColorStop(1, "#ffb1d800");
    scene.ctx.fillStyle = glow;
    scene.ctx.fillRect(view.left, view.top, view.width, view.height);
    scene.ctx.strokeStyle = "#ffb7d9";
    scene.ctx.shadowColor = "#ff70bd";
    scene.ctx.shadowBlur = 18;
    scene.ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const r = 45 + ((t * 0.12 + i * 65) % 200);
      scene.ctx.globalAlpha = intensity * (1 - r / 270);
      scene.ctx.beginPath();
      scene.ctx.ellipse(f.x, 439 - f.y, r, r * 0.2, 0, 0, Math.PI * 2);
      scene.ctx.stroke();
    }
    if (!scene.reducedMotion)
      for (let i = 0; i < 14; i++) {
        const x = f.x + Math.sin(i * 2.4) * 180,
          y = 440 - f.y - ((t * 0.25 + i * 39) % 350);
        scene.ctx.globalAlpha = intensity * 0.6;
        scene.ctx.fillStyle = "#ffd0e6";
        scene.ctx.fillRect(x, y, 2, 9);
      }
    scene.ctx.restore();
  }
}

export function drawHeldProps(scene: BattleSceneContext) {
  for (const f of scene.match.fighters) {
    const move = MOVES[f.attack ?? ""];
    if (
      scene.match.phase !== "fighting" ||
      !(move?.nonoka || move?.yuno || move?.ritsu || move?.miyako) ||
      f.stun ||
      f.knockdown
    )
      continue;
    scene.ctx.save();
    scene.ctx.translate(f.x, 438 - f.y);
    scene.ctx.scale(f.facing, 1);
    if (move.nonoka)
      drawNonokaSkill(scene.ctx, move, f.attackMs, scene.reducedMotion);
    else if (move.yuno)
      drawYunoSkill(scene.ctx, move, f.attackMs, scene.reducedMotion);
    else if (move.ritsu)
      drawRitsuSkill(scene.ctx, move, f.attackMs, scene.reducedMotion);
    else drawMiyakoSkill(scene.ctx, move, f.attackMs, scene.reducedMotion);
    scene.ctx.restore();
  }
}
