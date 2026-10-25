import { MOVES } from "../../../../../game/engine";
import { drawNonokaShield } from "../drawNonokaSkills";
import { drawAraleShield } from "../drawAraleSkills";
import type { BattleSceneContext } from "./objects";
export function drawShield(scene: BattleSceneContext, side: number) {
  const f = scene.match.fighters[side],
    steel = f.shield;
  if (!steel || scene.match.phase !== "fighting") return;
  if (f.character >= 5) {
    scene.ctx.save();
    scene.ctx.translate(f.x + f.facing * 58, 438 - f.y - 110);
    scene.ctx.globalAlpha = Math.min(1, steel.ms / 200);
    scene.ctx.strokeStyle = f.character === 13 ? "#ff91d6" : "#e1d7ff";
    scene.ctx.fillStyle = "#adbbef25";
    scene.ctx.shadowColor = "#d4caff";
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : steel.hitMs ? 22 : 8;
    if (f.character === 10) {
      drawAraleShield(scene.ctx, steel.hp);
      scene.ctx.restore();
      return;
    }
    if (f.character === 14) {
      drawNonokaShield(scene.ctx, steel.hp);
      scene.ctx.restore();
      return;
    }
    scene.ctx.lineWidth = 3;
    scene.ctx.beginPath();
    scene.ctx.ellipse(0, 0, 28, 106, 0, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.stroke();
    scene.ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      scene.ctx.beginPath();
      scene.ctx.moveTo(-22, i * 20);
      scene.ctx.lineTo(22, i * 20);
      scene.ctx.stroke();
    }
    scene.ctx.font = "28px Georgia";
    scene.ctx.textAlign = "center";
    scene.ctx.fillStyle = "#f0eaff";
    scene.ctx.fillText("♪", 0, 10);
    scene.ctx.shadowBlur = 0;
    scene.ctx.fillStyle = "#182539";
    scene.ctx.fillRect(-27, -130, 54, 5);
    scene.ctx.fillStyle = "#dad3ff";
    scene.ctx.fillRect(-27, -130, (54 * steel.hp) / 24, 5);
    scene.ctx.font = 'bold 10px "Segoe UI",sans-serif';
    scene.ctx.fillText(
      (f.character === 13 ? "合奏 " : "茶会 ") + steel.hp,
      0,
      -138,
    );
    scene.ctx.restore();
    return;
  }
  scene.ctx.save();
  scene.ctx.translate(f.x + f.facing * 58, 438 - f.y);
  scene.ctx.scale(f.facing, 1);
  scene.ctx.globalAlpha = Math.min(1, steel.ms / 200);
  scene.ctx.shadowColor = "#aee6ff";
  scene.ctx.shadowBlur = steel.hitMs ? 22 : 7;
  const metal = scene.ctx.createLinearGradient(-23, 0, 24, 0);
  metal.addColorStop(0, "#394956");
  metal.addColorStop(0.12, "#dae7ef");
  metal.addColorStop(0.3, "#8899a8");
  metal.addColorStop(0.65, "#abbac5");
  metal.addColorStop(1, "#4a5f70");
  scene.ctx.fillStyle = metal;
  scene.ctx.strokeStyle = "#e0eff7";
  scene.ctx.lineWidth = 2;
  scene.ctx.beginPath();
  scene.ctx.moveTo(-23, -222);
  scene.ctx.lineTo(23, -211);
  scene.ctx.lineTo(23, -12);
  scene.ctx.lineTo(-23, -2);
  scene.ctx.closePath();
  scene.ctx.fill();
  scene.ctx.stroke();
  scene.ctx.shadowBlur = 0;
  scene.ctx.strokeStyle = "#283d4e";
  scene.ctx.lineWidth = 3;
  scene.ctx.beginPath();
  scene.ctx.moveTo(-17, -211);
  scene.ctx.lineTo(-17, -12);
  scene.ctx.stroke();
  scene.ctx.strokeStyle = "#e6f1f530";
  scene.ctx.lineWidth = 1;
  for (let y = -200; y < -15; y += 5) {
    scene.ctx.beginPath();
    scene.ctx.moveTo(-12, y);
    scene.ctx.lineTo(18, y + 2);
    scene.ctx.stroke();
  }
  for (const y of [-199, -27])
    for (const x of [-11, 12]) {
      scene.ctx.fillStyle = "#344b5d";
      scene.ctx.beginPath();
      scene.ctx.arc(x, y, 3, 0, Math.PI * 2);
      scene.ctx.fill();
      scene.ctx.fillStyle = "#dae6ee";
      scene.ctx.fillRect(x - 1, y - 2, 2, 1);
    }
  scene.ctx.strokeStyle = "#e7b46f";
  scene.ctx.lineWidth = 5;
  for (let y = -185; y < -40; y += 26) {
    scene.ctx.beginPath();
    scene.ctx.moveTo(18, y);
    scene.ctx.lineTo(18, y + 12);
    scene.ctx.stroke();
  }
  if (steel.hp < 20) {
    scene.ctx.strokeStyle = "#263947";
    scene.ctx.lineWidth = 2;
    scene.ctx.beginPath();
    scene.ctx.moveTo(-8, -160);
    scene.ctx.lineTo(5, -137);
    scene.ctx.lineTo(-5, -120);
    scene.ctx.lineTo(11, -96);
    scene.ctx.lineTo(0, -73);
    scene.ctx.stroke();
  }
  if (steel.hitMs) {
    scene.ctx.fillStyle = `rgba(235,249,255,${steel.hitMs / 250})`;
    scene.ctx.fillRect(-15, -205, 31, 190);
  }
  scene.ctx.scale(f.facing, 1);
  scene.ctx.fillStyle = "#152c40";
  scene.ctx.fillRect(-27, -240, 54, 6);
  scene.ctx.fillStyle = steel.hp > 15 ? "#bde8fc" : "#ffc475";
  scene.ctx.fillRect(-27, -240, (54 * steel.hp) / MOVES.shield.durability!, 6);
  scene.ctx.fillStyle = "#e0f5ff";
  scene.ctx.textAlign = "center";
  scene.ctx.font = 'bold 10px "Segoe UI",sans-serif';
  scene.ctx.fillText("钢板 " + steel.hp, 0, -248);
  scene.ctx.restore();
}

export function drawSummons(scene: BattleSceneContext) {
  const art = scene.assets.soyoTensora,
    tensoraAtlas = scene.getImage(art.atlas);
  if (!tensoraAtlas) return;
  for (const [side, f] of scene.match.fighters.entries()) {
    const group = f.summons;
    if (!group) continue;
    for (const p of group.units) {
      const age = 10000 - group.ms,
        bob =
          Math.abs(Math.sin(scene.state.visualTime * 0.012 + p.id * 1.8)) *
          (p.phase === "charge" ? 12 : 6);
      const index =
        p.hitMs > 0
          ? 3
          : p.phase === "charge"
            ? 2
            : Math.floor(scene.state.visualTime / 160 + p.id) % 2;
      const frame = art.frames[index],
        scale = (frame.height ?? 72) / frame.h;
      const surface = scene.match.surfaceBelow(p.x, p.y),
        ground = 438 - surface;
      scene.ctx.save();
      scene.ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
      scene.ctx.fillStyle = "#09101c66";
      scene.ctx.beginPath();
      scene.ctx.ellipse(p.x, ground + 3, 21, 5, 0, 0, Math.PI * 2);
      scene.ctx.fill();
      scene.ctx.strokeStyle = scene.colors[side];
      scene.ctx.lineWidth = 1;
      scene.ctx.beginPath();
      scene.ctx.ellipse(p.x, ground + 2, 19, 4, 0, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.translate(p.x, 438 - p.y - bob);
      scene.ctx.scale(p.facing * scale, scale);
      scene.ctx.shadowColor = "#e9ba64";
      scene.ctx.shadowBlur = p.hitMs ? 10 : 2;
      scene.ctx.drawImage(
        tensoraAtlas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        -frame.ax,
        -frame.ay,
        frame.w,
        frame.h,
      );
      scene.ctx.restore();
      scene.ctx.save();
      scene.ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
      scene.ctx.translate(p.x, 438 - p.y - bob - 82);
      scene.ctx.fillStyle = "#111726df";
      scene.ctx.fillRect(-23, -3, 46, 6);
      scene.ctx.fillStyle = p.hp <= 6 ? "#ef8d8d" : "#f1d38c";
      scene.ctx.fillRect(-22, -2, (44 * p.hp) / p.maxHp, 4);
      scene.ctx.font = "bold 9px sans-serif";
      scene.ctx.textAlign = "center";
      scene.ctx.fillStyle = "#fff0cf";
      scene.ctx.fillText(p.hp + "/" + p.maxHp, 0, -7);
      scene.ctx.restore();
    }
  }
}
