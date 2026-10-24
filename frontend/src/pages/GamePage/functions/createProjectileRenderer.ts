import { MOVES, ROSTER } from "../../../game/engine";
import type { Assets } from "../../../game/objects/Assets";
import type { Wave } from "../../../game/objects/Wave";
import { drawBurger } from "./drawBurger";
import { drawNyamuProjectile } from "./drawNyamuSkills";
import { drawUmiriProjectile } from "./drawUmiriSkills";
import { drawUikaProjectile } from "./drawUikaSkills";
import { drawNonokaProjectile } from "./drawNonokaSkills";

/** Keep each character's authored projectile silhouette and trail. */
export function createProjectileRenderer(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  getImage: (url: string) => HTMLImageElement | undefined,
  reducedMotion: boolean,
) {
  const colors = ["#f6a4c7", "#65d1ee"];
  function drawMujicaWave(w: Wave) {
    const move = MOVES[w.attack],
      profile = ROSTER[move.ownerCharacter!];
    ctx.save();
    ctx.translate(w.x, 438 - w.y);
    ctx.scale(w.vx >= 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120);
    ctx.strokeStyle = profile.color;
    ctx.fillStyle = profile.color;
    ctx.shadowColor = profile.color;
    ctx.shadowBlur = reducedMotion ? 0 : 10;
    ctx.lineWidth = 3;
    if (move.uika) {
      drawUikaProjectile(ctx, w.age, reducedMotion);
    } else if (move.umiri) {
      drawUmiriProjectile(ctx, move, w.age, reducedMotion);
    } else if (move.nyamu) {
      drawNyamuProjectile(ctx, move, w.age, reducedMotion);
    } else if (move.mortis === "burger") {
      ctx.rotate(Math.sin(w.age * 0.009) * 0.12);
      drawBurger(ctx, 0, 0);
    } else if (
      move.ownerCharacter! === 8 &&
      move.form === "normal" &&
      move.slot === "u"
    ) {
      ctx.rotate(w.age * 0.008);
      ctx.fillStyle = "#76a347";
      ctx.strokeStyle = "#d7e89d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 29, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#aac773";
      ctx.lineWidth = 1;
      for (const y of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(-22, y);
        ctx.lineTo(22, y);
        ctx.stroke();
      }
    } else if (move.ownerCharacter! === 6) {
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha *= 0.88;
        ctx.fillRect(-i * 12, -w.ry! / 2, 8, w.ry!);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha *= 0.8;
        ctx.beginPath();
        ctx.ellipse(
          -i * 10,
          0,
          Math.max(6, w.rx! - i * 3),
          Math.max(8, w.ry! - i * 5),
          0,
          -1.4,
          1.4,
        );
        ctx.stroke();
      }
      if (move.groundShock) {
        ctx.beginPath();
        ctx.moveTo(-45, 20);
        ctx.lineTo(22, 20);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawMewtypeWave(w: Wave) {
    const owner = MOVES[w.attack].ownerCharacter!,
      color = ROSTER[owner].color;
    ctx.save();
    ctx.translate(w.x, 438 - w.y);
    ctx.scale(w.vx >= 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = reducedMotion ? 0 : 12;
    ctx.lineWidth = 3;
    if (MOVES[w.attack].nonoka === "bite") {
      drawNonokaProjectile(ctx);
    } else if (w.attack.endsWith("_wave")) {
      const opacity = ctx.globalAlpha;
      // Trailing crescents show direction while the core identifies the character.
      for (let i = 2; i >= 0; i--) {
        ctx.globalAlpha = opacity * (0.18 + (2 - i) * 0.12);
        ctx.beginPath();
        ctx.ellipse(-18 - i * 15, 0, w.rx!, w.ry! * 0.85, 0, -1.25, 1.25);
        ctx.stroke();
      }
      ctx.globalAlpha = opacity;
      if (owner === 10) {
        ctx.fillStyle = "#ffd7e8";
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.bezierCurveTo(-50, -5, -28, -40, 0, -20);
        ctx.bezierCurveTo(28, -40, 50, -5, 0, 25);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, -5);
        ctx.lineTo(4, -23);
        ctx.lineTo(15, -18);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -3, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else if (owner === 11) {
        ctx.fillStyle = "#d5eaff";
        ctx.beginPath();
        ctx.ellipse(2, 10, 22, 17, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(
            -22 + i * 15,
            -17 - Math.sin((i * Math.PI) / 3) * 8,
            7,
            10,
            (i - 1.5) * 0.2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(12, -4 + i * 9);
          ctx.lineTo(35, -10 + i * 9);
        }
        ctx.stroke();
      } else if (owner === 12) {
        for (let i = 2; i >= 0; i--) {
          ctx.save();
          ctx.translate(-i * 14, i * 5);
          ctx.rotate(-0.18 + i * 0.1);
          ctx.globalAlpha = opacity * (1 - i * 0.22);
          ctx.fillStyle = "#fff8ef";
          ctx.fillRect(-20, -29, 40, 58);
          ctx.strokeRect(-20, -29, 40, 58);
          ctx.strokeRect(-14, -23, 28, 18);
          ctx.strokeRect(-14, 2, 12, 20);
          ctx.strokeRect(4, 2, 10, 20);
          ctx.restore();
        }
        ctx.beginPath();
        ctx.moveTo(-33, 14);
        ctx.quadraticCurveTo(3, -25, 35, -4);
        ctx.stroke();
      } else if (owner === 13) {
        ctx.beginPath();
        ctx.ellipse(10, 0, 22, w.ry!, 0, -1.4, 1.4);
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const h = 14 + (1 + Math.sin(w.age * 0.02 + i * 1.2)) * 18;
          ctx.fillRect(-28 + i * 8, -h / 2, 4, h);
        }
        ctx.strokeStyle = "#ffe5fa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = -30; x <= 30; x += 3) {
          const y = Math.sin(x * 0.16 - w.age * 0.02) * 15;
          if (x === -30) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (owner === 14) {
        ctx.fillStyle = "#edfff6";
        ctx.beginPath();
        ctx.moveTo(29, 1);
        ctx.quadraticCurveTo(-23, 41, -22, 0);
        ctx.quadraticCurveTo(-23, -35, 29, 1);
        ctx.fill();
        ctx.stroke();
        for (const x of [-10, 6]) {
          ctx.beginPath();
          ctx.ellipse(x, -24, 5, 15, x < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(10, 2);
        ctx.lineTo(0, 10);
        ctx.stroke();
      }
    } else if (owner === 12) {
      ctx.rotate(w.age * 0.006);
      ctx.fillStyle = "#fff8ef";
      ctx.fillRect(-21, -28, 42, 56);
      ctx.strokeRect(-21, -28, 42, 56);
      ctx.lineWidth = 2;
      ctx.strokeRect(-15, -22, 30, 19);
      ctx.strokeRect(-15, 3, 13, 18);
      ctx.strokeRect(4, 3, 11, 18);
    } else if (owner === 13) {
      ctx.fillStyle = "#222336";
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 16, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let r = 9; r < 35; r += 8) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.4, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha *= 0.8;
        ctx.beginPath();
        ctx.ellipse(
          -i * 12,
          0,
          Math.max(8, w.rx! - i * 4),
          Math.max(12, w.ry! - i * 7),
          0,
          -1.35,
          1.35,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = Math.min(1, w.life / 120);
      ctx.beginPath();
      ctx.ellipse(0, 8, 8, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, 8);
      ctx.lineTo(7, -20);
      ctx.lineTo(18, -13);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawWave(w: Wave) {
    if (MOVES[w.attack]?.customerService) {
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.globalAlpha = Math.min(1, w.life / 150);
      ctx.strokeStyle = "#b5cffc";
      ctx.fillStyle = "#ecf2ff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 12 - 17, 0, 10 + i * 7, 22 + i * 12, 0, -1.25, 1.25);
        ctx.stroke();
      }
      // A phone receiver identifies this as the customer-service call, separate from keyboard waves.
      ctx.save();
      ctx.rotate(-0.35);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(-17, 0, 15, -0.95, 0.95);
      ctx.stroke();
      ctx.fillRect(-12, -17, 10, 8);
      ctx.fillRect(-12, 9, 10, 8);
      ctx.restore();
      ctx.restore();
      return;
    }
    if (w.radial) {
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.globalAlpha = Math.min(1, w.life / 220);
      if (MOVES[w.attack].mortis === "scream") {
        ctx.strokeStyle = "#c4edb4";
        ctx.shadowColor = "#83ad80";
        ctx.shadowBlur = reducedMotion ? 0 : 14;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius!, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#bba3ef";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const angle = (i * Math.PI * 2) / 96,
            vibration = reducedMotion ? 0 : Math.sin(w.age * 0.04 + i) * 2,
            radius = Math.max(
              0,
              w.radius! - 12 + (i % 3 === 0 ? 9 : -3) + vibration,
            ),
            x = Math.cos(angle) * radius,
            y = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        // Broken mask fragments travel with the wave instead of musical notes.
        ctx.fillStyle = "#e4e8d8";
        for (let i = 0; i < 8; i++) {
          const angle =
              (i * Math.PI) / 4 + (reducedMotion ? 0 : w.age * 0.0003),
            x = Math.cos(angle) * w.radius!,
            y = Math.sin(angle) * w.radius!;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-7, -3);
          ctx.lineTo(4, -7);
          ctx.lineTo(8, 2);
          ctx.lineTo(-3, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        return;
      }
      ctx.strokeStyle = "#c4ebff";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#a7dfff";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      ctx.beginPath();
      ctx.arc(0, 0, w.radius!, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#fff0bc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, w.radius! - 10), 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + (reducedMotion ? 0 : w.age * 0.00035),
          x = Math.cos(angle) * w.radius!,
          y = Math.sin(angle) * w.radius!;
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, -0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 4, y - 16);
        ctx.lineTo(x + 12, y - 12);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (w.attack === "anonCry") {
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.globalAlpha = Math.min(1, w.life / 150);
      ctx.strokeStyle = "#b7e7ff";
      ctx.fillStyle = "#dbf3ff";
      ctx.shadowColor = "#80c4ef";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          -i * 14,
          0,
          Math.max(7, w.rx! - i * 5),
          Math.max(10, w.ry! - i * 8),
          0,
          -1.35,
          1.35,
        );
        ctx.stroke();
      }
      for (const [x, y] of [
        [-12, -18],
        [-31, 20],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.quadraticCurveTo(x - 10, y + 4, x, y + 7);
        ctx.quadraticCurveTo(x + 9, y + 3, x, y - 10);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if ((MOVES[w.attack]?.ownerCharacter ?? -1) >= 10) {
      drawMewtypeWave(w);
      return;
    }
    if ((MOVES[w.attack]?.ownerCharacter ?? -1) >= 5) {
      drawMujicaWave(w);
      return;
    }
    if (MOVES[w.attack]?.rikiOnly) {
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.strokeStyle = "#dfccff";
      ctx.fillStyle = "#baa0e333";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 10, w.rx!, w.ry!, -0.25, -1.8, 1.3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-48, 38);
      ctx.lineTo(15, 38);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (w.attack === "ranaParfait") {
      const parfaitImage = getImage(assets.ranaParfait.src);
      if (!parfaitImage) return;
      const h = assets.ranaParfait.height,
        width = (parfaitImage.width / parfaitImage.height) * h;
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.rotate(
        Math.atan2(-w.vy!, Math.abs(w.vx)) * 0.35 +
          Math.sin(w.age * 0.009) * 0.16,
      );
      ctx.globalAlpha = Math.min(1, w.life / 120);
      ctx.shadowColor = "#82953e";
      ctx.shadowBlur = reducedMotion ? 0 : 5;
      ctx.drawImage(parfaitImage, -width / 2, -h / 2, width, h);
      ctx.restore();
      return;
    }
    if (MOVES[w.attack]?.penguinOnly) {
      drawPenguinWave(w);
      return;
    }
    if (MOVES[w.attack]?.ranaOnly) {
      ctx.save();
      ctx.translate(w.x, 438 - w.y);
      ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.strokeStyle = "#d2f4c9";
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.min(1, w.life / 150);
      ctx.shadowColor = "#a4d6ad";
      ctx.shadowBlur = reducedMotion ? 0 : 12;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(
          -i * 6,
          0,
          Math.max(6, w.rx! - i * 2),
          Math.max(10, w.ry! - i * 3),
          0,
          -1.35,
          1.35,
        );
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (MOVES[w.attack]?.tomoriOnly) {
      drawVoiceWave(w);
      return;
    }
    if (w.attack === "sonic") {
      drawSonicWave(w);
      return;
    }
    const x = w.x,
      y = 438 - w.y,
      color = colors[w.owner];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 22, 0, -0.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();
    ctx.font = "bold 38px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("♪", 0, 12);
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-24 - i * 10, -10 + i * 10);
      ctx.lineTo(-42 - i * 9, -10 + i * 10);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPenguinWave(w: Wave) {
    ctx.save();
    ctx.translate(w.x, 438 - w.y);
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 140);
    ctx.strokeStyle = "#fff0c8";
    ctx.fillStyle = "#ecf7ff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#eac589";
    ctx.shadowBlur = reducedMotion ? 0 : 12;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(
        -i * 11,
        0,
        Math.max(6, w.rx! - i * 5),
        Math.max(8, w.ry! - i * 9),
        0,
        -1.25,
        1.25,
      );
      ctx.stroke();
    }
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.font = 'bold 16px "Microsoft YaHei",sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      w.attack === "penguinHey"
        ? "hey?"
        : w.attack === "penguinCall"
          ? "咕嘎！"
          : "呜！",
      0,
      -w.ry! - 8,
    );
    ctx.restore();
  }
  function drawVoiceWave(w: Wave) {
    const wide = w.attack !== "tomoriNote",
      chorus = w.attack === "tomoriChorus" || w.attack === "tomoriSuper";
    ctx.save();
    ctx.translate(w.x, 438 - w.y);
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 180);
    ctx.shadowColor = "#a8bfdc";
    ctx.shadowBlur = reducedMotion ? 0 : 12;
    ctx.strokeStyle = chorus ? "#e4c3df" : "#c1deed";
    ctx.fillStyle = "#d5e8f2";
    ctx.lineWidth = chorus ? 3 : 2;
    for (let i = 0; i < (wide ? 3 : 1); i++) {
      ctx.beginPath();
      ctx.ellipse(
        -i * 13,
        0,
        Math.max(8, w.rx! - i * 5),
        w.ry! - i * 9,
        0,
        -1.25,
        1.25,
      );
      ctx.stroke();
    }
    const flutter = Math.sin(w.age * 0.012) * 5;
    ctx.beginPath();
    ctx.ellipse(-5, 9 + flutter, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 8 + flutter);
    ctx.lineTo(2, -20 + flutter);
    ctx.lineTo(17, -16 + flutter);
    ctx.stroke();
    if (chorus) {
      ctx.beginPath();
      ctx.arc(-18, -18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawSonicWave(w: Wave) {
    const rx = w.rx!,
      ry = w.ry!;
    ctx.save();
    ctx.translate(w.x, 438 - w.y);
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120);
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, ry);
    glow.addColorStop(0, "#fff1fa85");
    glow.addColorStop(0.4, "#f98acb4a");
    glow.addColorStop(1, "#f98acb00");
    ctx.fillStyle = glow;
    ctx.fillRect(-rx * 1.5, -ry, rx * 3, ry * 2);
    ctx.shadowColor = "#ff8dce";
    ctx.shadowBlur = 22;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ["#fff1fa", "#ff98d0", "#a9e5ff", "#fa8ec7"][i];
      ctx.lineWidth = i ? 2.5 : 5;
      ctx.beginPath();
      ctx.ellipse(
        -i * rx * 0.43,
        0,
        rx * (1 - i * 0.12),
        ry * (1 - i * 0.12),
        0,
        -Math.PI / 2,
        Math.PI / 2,
      );
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff5fd";
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const x = -rx * 1.3 + (i / 28) * rx * 2;
      const y =
        Math.sin(i * 1.7 - w.age * 0.025) *
        (8 + Math.sin((i / 28) * Math.PI) * 14);
      if (!i) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.font = '900 italic 21px "Segoe UI",sans-serif';
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#48243d";
    ctx.strokeText("TGW!!", 0, -ry - 12);
    ctx.fillStyle = "#ffe8f5";
    ctx.fillText("TGW!!", 0, -ry - 12);
    ctx.restore();
  }

  return drawWave;
}
