import { bandFor } from "../../../../../game/bands";
import { MOVES, ROSTER } from "../../../../../game/engine";
import { drawBurger } from "../drawBurger";
import { drawBloodFist, drawLifestealAura } from "../drawBloodFist";
import { drawMiyakoArea } from "../drawMiyakoSkills";
import { drawNyamuSkill } from "../drawNyamuSkills";
import { drawUikaArea, drawUikaSkill } from "../drawUikaSkills";
import { drawUmiriSkill } from "../drawUmiriSkills";
import { drawYunoArea } from "../drawYunoSkills";
import { drawSakikoSuper } from "../drawSakikoSuper";
import { drawViolaArea } from "../drawViolaSkills";
import type { BattleSceneContext } from "./objects";
export function drawMujicaEffects(scene: BattleSceneContext) {
  if (scene.match.phase !== "fighting") return;
  for (const area of scene.match.areas) {
    const profile = ROSTER[scene.match.fighters[area.owner].character],
      y = 438 - area.y;
    scene.ctx.save();
    scene.ctx.strokeStyle = profile.color;
    scene.ctx.fillStyle = profile.color + "25";
    scene.ctx.lineWidth = 2;
    scene.ctx.globalAlpha = area.fired
      ? Math.max(0, area.life / 100)
      : 0.45 + Math.sin(scene.state.visualTime * 0.025) * 0.2;
    if (MOVES[area.attack].viola === "edit") {
      drawViolaArea(scene.ctx, area);
      scene.ctx.restore();
      continue;
    }
    if (MOVES[area.attack].uika === "cage") {
      drawUikaArea(scene.ctx, area, MOVES[area.attack], scene.reducedMotion);
      scene.ctx.restore();
      continue;
    }
    if (MOVES[area.attack].yuno === "seaside") {
      drawYunoArea(scene.ctx, area);
      scene.ctx.restore();
      continue;
    }
    if (MOVES[area.attack].miyako === "stamp") {
      drawMiyakoArea(scene.ctx, area);
      scene.ctx.restore();
      continue;
    }
    if (MOVES[area.attack].mortis === "snare") {
      scene.ctx.strokeStyle = "#d8eab4";
      scene.ctx.beginPath();
      scene.ctx.ellipse(area.x, y, area.radius, 22, 0, 0, Math.PI * 2);
      scene.ctx.stroke();
      for (const direction of [-1, 1]) {
        scene.ctx.beginPath();
        scene.ctx.moveTo(area.x + direction * area.radius, y - 230);
        scene.ctx.lineTo(area.x - direction * 30, y - (area.fired ? 120 : 12));
        scene.ctx.stroke();
      }
      scene.ctx.restore();
      continue;
    }
    if (profile.bandId === "mewtype") {
      scene.ctx.strokeRect(area.x - area.radius, y - 12, area.radius * 2, 24);
      const rise = area.fired ? 160 : 20 + 40 * (1 - area.warning / 600);
      for (let i = -1; i <= 1; i++) {
        const x = area.x + i * area.radius * 0.6;
        scene.ctx.fillRect(x - 25, y - rise, 50, rise);
        scene.ctx.strokeRect(x - 25, y - rise, 50, rise);
        scene.ctx.beginPath();
        scene.ctx.moveTo(x - 17, y - rise + 12);
        scene.ctx.lineTo(x + 17, y - rise + 12);
        scene.ctx.stroke();
      }
      scene.ctx.restore();
      continue;
    }
    scene.ctx.beginPath();
    scene.ctx.ellipse(area.x, y, area.radius, 18, 0, 0, Math.PI * 2);
    scene.ctx.fill();
    scene.ctx.stroke();
    const rise = area.fired ? 180 : 20 + 55 * (1 - area.warning / 600);
    for (let i = -2; i <= 2; i++) {
      const x = area.x + (i * area.radius) / 3;
      scene.ctx.beginPath();
      scene.ctx.moveTo(x, y);
      scene.ctx.lineTo(x, y - rise);
      scene.ctx.stroke();
    }
    scene.ctx.restore();
  }
  for (const f of scene.match.fighters) {
    if (bandFor(f.character).id === "mygo") continue;
    if (f.lifesteal)
      drawLifestealAura(
        scene.ctx,
        f,
        scene.state.visualTime,
        scene.reducedMotion,
      );
    const profile = ROSTER[f.character],
      move = MOVES[f.attack ?? ""];
    if (move?.mortis === "bloodFist" && !f.stun) {
      drawBloodFist(scene.ctx, f, move, scene.reducedMotion);
      continue;
    }
    if (move?.sakiko === "ascension") {
      drawSakikoSuper(scene.ctx, f, move, scene.reducedMotion);
      continue;
    }
    scene.ctx.save();
    scene.ctx.translate(f.x, 438 - f.y);
    scene.ctx.strokeStyle = profile.color;
    scene.ctx.fillStyle = profile.color;
    if (
      !move ||
      move.ownerCharacter! !== f.character ||
      f.stun ||
      !move.slot ||
      move.nonoka ||
      move.yuno ||
      move.ritsu ||
      move.miyako ||
      move.arale ||
      move.viola
    ) {
      scene.ctx.restore();
      continue;
    }
    const age = f.attackMs,
      active = age >= move.start && age <= move.end;
    scene.ctx.scale(f.facing, 1);
    scene.ctx.lineWidth = active ? 3 : 1.5;
    scene.ctx.globalAlpha = active ? 0.8 : 0.28;
    scene.ctx.shadowColor = profile.color;
    scene.ctx.shadowBlur = scene.reducedMotion ? 0 : active ? 12 : 3;
    if (move.uika) {
      drawUikaSkill(scene.ctx, move, age, scene.reducedMotion);
    } else if (move.umiri) {
      drawUmiriSkill(scene.ctx, move, age, scene.reducedMotion);
    } else if (move.nyamu) {
      drawNyamuSkill(scene.ctx, move, age, scene.reducedMotion);
    } else if (move.mortis) {
      const ghost = (
        offset: number,
        form: string,
        pose: string,
        alpha: number,
      ) => {
        const art = scene.assets.mujicaForms[8]?.[form],
          image = art && scene.getImage(art.atlas),
          frame = art?.frames.find((frame) => frame.name === pose);
        if (!image || !frame) return;
        const scale = 235 / frame.h;
        scene.ctx.save();
        scene.ctx.globalAlpha = alpha;
        scene.ctx.shadowBlur = 0;
        scene.ctx.drawImage(
          image,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          offset - frame.ax * scale,
          -frame.ay * scale,
          frame.w * scale,
          frame.h * scale,
        );
        scene.ctx.restore();
      };
      if (move.mortis === "toddler") {
        const pulse = Math.min(1, age / move.end);
        for (let i = 0; i < 3; i++) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(
            0,
            -115,
            45 + pulse * 180 - i * 20,
            35 + pulse * 70,
            0,
            0,
            Math.PI * 2,
          );
          scene.ctx.stroke();
        }
      } else if (move.mortis === "scream") {
        scene.ctx.strokeStyle = "#c4edb4";
        scene.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const radius =
            24 + i * 17 + (scene.reducedMotion ? 0 : (age * 0.08) % 17);
          scene.ctx.globalAlpha = (active ? 0.65 : 0.2) * (1 - i * 0.2);
          scene.ctx.beginPath();
          scene.ctx.ellipse(0, -145, radius, radius * 1.2, 0, 0, Math.PI * 2);
          scene.ctx.stroke();
        }
      } else if (move.mortis === "burger") {
        if (age < move.start) drawBurger(scene.ctx, 65, -150, 0.6);
      } else if (move.mortis === "double" || move.mortis === "theater") {
        const theater = move.mortis === "theater",
          offsets = theater ? [-180, 180] : [150, 270];
        offsets.forEach((offset, index) => {
          ghost(
            offset,
            index ? "stage" : "normal",
            theater && index ? "super-impact" : "idle",
            active ? 0.5 : 0.18,
          );
          scene.ctx.beginPath();
          scene.ctx.moveTo(offset - 35, -350);
          scene.ctx.lineTo(offset - 25, -140);
          scene.ctx.moveTo(offset + 35, -350);
          scene.ctx.lineTo(offset + 25, -140);
          scene.ctx.stroke();
        });
        if (theater) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(0, -90, move.reach!, 170, 0, 0, Math.PI * 2);
          scene.ctx.stroke();
        }
      } else if (move.mortis === "parry") {
        ghost(-55, "normal", "idle", 0.22);
        scene.ctx.beginPath();
        scene.ctx.ellipse(20, -115, 62, 108, 0, 0, Math.PI * 2);
        scene.ctx.stroke();
        scene.ctx.beginPath();
        scene.ctx.moveTo(-20, -90);
        scene.ctx.quadraticCurveTo(15, -60, 50, -90);
        scene.ctx.stroke();
      } else {
        scene.ctx.beginPath();
        scene.ctx.moveTo(0, -240);
        scene.ctx.lineTo(130, -80);
        scene.ctx.lineTo(30, -200);
        scene.ctx.stroke();
      }
    } else if (move.counter) {
      scene.ctx.beginPath();
      scene.ctx.ellipse(38, -105, 34, 85, 0, -0.5 * Math.PI, 0.5 * Math.PI);
      scene.ctx.stroke();
    } else if (move.targetArea && f.attackTarget) {
      scene.ctx.save();
      scene.ctx.scale(f.facing, 1);
      const center = f.binding ?? f.attackTarget,
        tx = center.x - f.x,
        ty = f.y - center.y,
        radius = f.binding ? 125 : move.areaRadius!,
        progress = Math.min(1, age / move.start),
        glyphs = "临兵斗者皆阵列在前",
        pulseAge = age - (move.pulses?.[f.hitMarks.at(-1) ?? 0]?.at ?? 0),
        flash = pulseAge >= 0 ? Math.max(0, 1 - pulseAge / 220) : 0;
      scene.ctx.strokeStyle = "#e3a6ff";
      scene.ctx.fillStyle = "#bc63fb";
      scene.ctx.shadowColor = "#ce78ff";
      scene.ctx.globalAlpha = f.binding ? 0.85 : 0.25 + progress * 0.2;
      // Two rings and eight surrounding talismans give the seal depth on every side.
      for (const height of [0, -255 * progress]) {
        scene.ctx.beginPath();
        scene.ctx.ellipse(tx, ty + height, radius, 26, 0, 0, Math.PI * 2);
        scene.ctx.stroke();
      }
      scene.ctx.font = "bold 24px serif";
      scene.ctx.textAlign = "center";
      scene.ctx.textBaseline = "middle";
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + Math.PI / 8,
          px = tx + Math.cos(angle) * radius,
          py = ty - 125 * progress + Math.sin(angle) * 30;
        scene.ctx.save();
        scene.ctx.translate(px, py);
        scene.ctx.fillStyle = "#280e3bb8";
        scene.ctx.fillRect(-18, -105 * progress, 36, 210 * progress);
        scene.ctx.strokeRect(-18, -105 * progress, 36, 210 * progress);
        scene.ctx.fillStyle = "#f3d8ff";
        scene.ctx.fillText(glyphs[i], 0, 0);
        scene.ctx.restore();
      }
      if (f.binding) {
        scene.ctx.globalAlpha = 0.35 + flash * 0.6;
        scene.ctx.lineWidth = 2 + flash * 3;
        // A different direction closes inward on each of the nine strikes.
        for (let i = 0; i < 4; i++) {
          const angle = ((f.hitMarks.length + i * 2) * Math.PI) / 4,
            dx = Math.cos(angle) * radius,
            dy = Math.sin(angle) * 115;
          scene.ctx.beginPath();
          scene.ctx.moveTo(tx + dx, ty - 120 + dy);
          scene.ctx.lineTo(tx + dx * (1 - flash), ty - 120 + dy * (1 - flash));
          scene.ctx.stroke();
        }
      }
      // The caster's ward lasts for the entire animation, including startup/recovery.
      scene.ctx.globalAlpha = 0.7;
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      scene.ctx.ellipse(0, -115, 57, 125, 0, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.fillStyle = "#f3d8ff";
      scene.ctx.font = "bold 13px sans-serif";
      scene.ctx.fillText("减伤 80%", 0, -260);
      scene.ctx.restore();
    } else if (!move.delayedArea && !move.durability!) {
      const reach = Math.min(move.reach || 170, 420),
        p = Math.min(1, age / Math.max(1, move.end));
      if (f.character === 10) {
        for (let i = 0; i < 3; i++) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(
            35 + (i * reach) / 4,
            -125,
            12 + i * 12 + p * 14,
            24 + i * 18,
            0,
            -1.25,
            1.25,
          );
          scene.ctx.stroke();
        }
      } else if (f.character === 12) {
        for (let i = 0; i < 3; i++) {
          scene.ctx.save();
          scene.ctx.translate(40 + (i * reach) / 4, -150 + i * 20);
          scene.ctx.rotate(-0.18 + i * 0.12);
          scene.ctx.strokeRect(0, 0, 48, 65);
          for (let j = 0; j < 3; j++) {
            scene.ctx.beginPath();
            scene.ctx.moveTo(8, 12 + j * 15);
            scene.ctx.lineTo(38, 12 + j * 15);
            scene.ctx.stroke();
          }
          scene.ctx.restore();
        }
      } else if (f.character === 13) {
        for (let i = 0; i < 9; i++) {
          const h = 12 + (1 + Math.sin(age * 0.025 + i * 0.9)) * 32;
          scene.ctx.fillRect(25 + (i * reach) / 11, -95 - h / 2, 8, h);
        }
      } else if (f.character === 6) {
        // Piano keys fan out from the conductor's hands.
        for (let i = 0; i < 7; i++) {
          const x = 30 + (i * reach) / 9,
            y = -125 + Math.sin(i * 0.65 + p * 2) * 25;
          scene.ctx.fillRect(x, y, 10, i % 3 ? 27 : 18);
        }
      } else if (f.character === 9) {
        // Drum hits form paired rings; the stage kit uses a faster eight-beat roll.
        const beat =
          (age % (f.stageForm ? 120 : 180)) / (f.stageForm ? 120 : 180);
        for (const offset of [-28, 28]) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(
            60 + reach * 0.3,
            -105 + offset,
            20 + beat * 55,
            12 + beat * 24,
            -0.35,
            0,
            Math.PI * 2,
          );
          scene.ctx.stroke();
        }
      } else {
        const low = move.level === "low",
          high = move.level === "high",
          y = low ? -35 : high ? -165 : -105;
        for (let i = 0; i < (f.character === 5 ? 4 : 6); i++) {
          scene.ctx.beginPath();
          scene.ctx.moveTo(28, y + i * 5);
          scene.ctx.quadraticCurveTo(
            reach * 0.55,
            y - (f.character === 7 ? 65 : 25) + i * 9,
            reach,
            y + i * 5,
          );
          scene.ctx.stroke();
        }
        if (move.pull) {
          scene.ctx.beginPath();
          scene.ctx.arc(reach, y, 15, -0.5, 2.6);
          scene.ctx.stroke();
        }
      }
      if (move.category === "super") {
        scene.ctx.globalAlpha *= 0.55;
        for (let i = 0; i < 3; i++) {
          scene.ctx.beginPath();
          scene.ctx.ellipse(
            90,
            -100,
            50 + i * 38 + p * 25,
            85 + i * 16,
            -0.3,
            -0.8,
            2,
          );
          scene.ctx.stroke();
        }
      }
    }
    scene.ctx.restore();
  }
}
