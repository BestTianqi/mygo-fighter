import type { BattleSceneContext } from "./objects";
export function drawBlinkTrails(scene: BattleSceneContext, dt: number) {
  for (const effect of scene.state.fx)
    if (effect.type === "blink") {
      if (!scene.match.paused) effect.life = Math.max(0, effect.life - dt);
      const age = effect.max - effect.life,
        { atlas, frame, scale, facing } = effect.sprite;
      const count = scene.reducedMotion ? 1 : 5;
      for (let i = 0; i < count; i++) {
        const position = i / 5,
          delay = position * effect.travelMs;
        if (age < delay) continue;
        const fade = Math.max(0, 1 - (age - delay) / (effect.max - delay));
        if (!fade) continue;
        const x = effect.fromX + (effect.toX - effect.fromX) * position;
        const y = effect.fromY + (effect.toY - effect.fromY) * position;
        scene.ctx.save();
        scene.ctx.translate(x, 438 - y);
        scene.ctx.scale(facing * scale, scale);
        scene.ctx.globalAlpha =
          (scene.reducedMotion ? 0.18 : 0.48) * fade * fade;
        scene.ctx.shadowColor = effect.color;
        scene.ctx.shadowBlur = scene.reducedMotion ? 0 : 7;
        scene.ctx.drawImage(
          atlas,
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
      }
    }
}

export function drawFx(scene: BattleSceneContext, dt: number) {
  for (const effect of scene.state.fx) {
    if (effect.type === "blink") continue;
    if (!scene.match.paused) effect.life -= dt;
    const progress = 1 - effect.life / effect.max;
    scene.ctx.save();
    scene.ctx.globalAlpha = Math.max(0, 1 - progress);
    scene.ctx.translate(effect.x, effect.y);
    scene.ctx.strokeStyle = effect.color;
    scene.ctx.fillStyle = effect.color;
    scene.ctx.shadowColor = effect.color;
    scene.ctx.shadowBlur = 16;
    if (effect.type === "incantation") {
      const radius = effect.radius * (0.72 + progress * 0.28);
      scene.ctx.save();
      scene.ctx.scale(1, 0.32);
      scene.ctx.strokeStyle = effect.color;
      scene.ctx.lineWidth = 3;
      scene.ctx.beginPath();
      scene.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      scene.ctx.stroke();
      scene.ctx.rotate(
        (effect.max - effect.life) * (scene.reducedMotion ? 0 : 0.001),
      );
      scene.ctx.beginPath();
      for (let i = 0; i <= 9; i++) {
        const angle = (i * Math.PI * 8) / 9;
        const x = Math.cos(angle) * radius,
          y = Math.sin(angle) * radius;
        if (!i) scene.ctx.moveTo(x, y);
        else scene.ctx.lineTo(x, y);
      }
      scene.ctx.stroke();
      scene.ctx.restore();
    } else if (effect.type === "landing") {
      scene.ctx.shadowBlur = 0;
      for (let i = 0; i < (effect.heavy ? 12 : 7); i++) {
        const direction = i % 2 ? -1 : 1,
          distance = progress * (30 + (i % 5) * 20);
        scene.ctx.globalAlpha = Math.max(0, 1 - progress) * 0.55;
        scene.ctx.beginPath();
        scene.ctx.ellipse(
          direction * distance,
          -Math.sin(progress * Math.PI) * (5 + (i % 3) * 9),
          6 + progress * 12,
          2 + progress * 4,
          0,
          0,
          Math.PI * 2,
        );
        scene.ctx.fill();
      }
    } else if (effect.type === "dash") {
      scene.ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = -effect.direction * (i * 9 + progress * 40),
          y = -4 - i * 3;
        scene.ctx.beginPath();
        scene.ctx.moveTo(x, y);
        scene.ctx.lineTo(x - effect.direction * (12 + progress * 20), y - 3);
        scene.ctx.stroke();
      }
    } else if (effect.type === "parfaitSplash") {
      scene.ctx.shadowBlur = 0;
      for (let i = 0; i < 15; i++) {
        const angle = i * 2.4,
          dist = 8 + progress * (35 + (i % 4) * 10);
        const x = Math.cos(angle) * dist,
          y = Math.sin(angle) * dist - progress * 18 + progress * progress * 38;
        scene.ctx.fillStyle = [
          "#a1ba45",
          "#fff0c6",
          "#e95d58",
          "#f4d278",
          "#79513a",
        ][i % 5];
        scene.ctx.beginPath();
        scene.ctx.ellipse(
          x,
          y,
          3 + (i % 3) * 2,
          2 + (i % 2) * 2,
          angle,
          0,
          Math.PI * 2,
        );
        scene.ctx.fill();
      }
    } else if (effect.type === "impact") {
      scene.ctx.save();
      scene.ctx.rotate(-0.4 * effect.direction);
      const size = (18 + effect.weight * 9) * (0.65 + progress * 1.8);
      const age = (effect.max - effect.life) / 1000,
        power = [1, 1.3, 1.85, 2.8][effect.weight];
      if (effect.weight >= 2 && age < 0.17) {
        scene.ctx.globalAlpha *=
          (1 - age / 0.17) * (scene.reducedMotion ? 0.25 : 0.8);
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.4,
            near = 55,
            far = (240 + effect.weight * 65) * (0.7 + (i % 3) * 0.15);
          scene.ctx.lineWidth = i % 2 ? 3 : 5;
          scene.ctx.beginPath();
          scene.ctx.moveTo(Math.cos(angle) * near, Math.sin(angle) * near);
          scene.ctx.lineTo(Math.cos(angle) * far, Math.sin(angle) * far);
          scene.ctx.stroke();
        }
        scene.ctx.globalAlpha = Math.max(0, 1 - progress);
      }
      for (let i = 0; i < 20 + effect.weight * 4; i++) {
        const angle = i * 2.39996,
          length = (12 + effect.weight * 10) * (1 - progress);
        scene.ctx.lineWidth = (i % 2 ? 2 : 4) * (1 - progress) + 1;
        const distance =
          ((650 + (i % 7) * 95) * power * (1 - Math.exp(-5 * age))) / 5;
        const x =
            Math.cos(angle) * distance * 1.2 +
            effect.direction * age * power * 100,
          y = Math.sin(angle) * distance * 0.65 + age * age * 200;
        scene.ctx.strokeStyle = i % 3 ? effect.color : "#fff4da";
        scene.ctx.beginPath();
        scene.ctx.moveTo(x, y);
        scene.ctx.lineTo(
          x + Math.cos(angle) * length * 0.3,
          y + Math.sin(angle) * length * 0.3,
        );
        scene.ctx.stroke();
        if (i % 5 === 0) {
          scene.ctx.save();
          scene.ctx.translate(x, y);
          scene.ctx.rotate(angle + progress * 4);
          scene.ctx.fillRect(-2, -3, 4, 6);
          scene.ctx.restore();
        }
      }
      scene.ctx.fillStyle = "#ffffff";
      scene.ctx.globalAlpha *= Math.max(0, 1 - progress * 2);
      scene.ctx.beginPath();
      scene.ctx.moveTo(-size * 0.7, 0);
      scene.ctx.lineTo(0, -size * 0.4);
      scene.ctx.lineTo(size * 0.7, 0);
      scene.ctx.lineTo(0, size * 0.4);
      scene.ctx.closePath();
      scene.ctx.fill();
      scene.ctx.restore();
    } else if (effect.type === "steelBreak") {
      for (let i = 0; i < 8; i++) {
        const angle = i * 2.4;
        scene.ctx.save();
        scene.ctx.translate(
          Math.cos(angle) * progress * 80,
          Math.sin(angle) * progress * 80 + progress * progress * 65,
        );
        scene.ctx.rotate(angle + progress * 5);
        scene.ctx.fillRect(-3, -6, 6, 12);
        scene.ctx.restore();
      }
    } else if (effect.type === "shock") {
      scene.ctx.lineWidth = 5 * (1 - progress) + 1;
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        0,
        0,
        40 + progress * 300,
        8 + progress * 45,
        0,
        0,
        Math.PI * 2,
      );
      scene.ctx.stroke();
    } else if (effect.type === "guard") {
      scene.ctx.lineWidth = 3;
      scene.ctx.beginPath();
      scene.ctx.ellipse(
        0,
        0,
        12 + progress * 18,
        38 + progress * 10,
        0,
        0,
        Math.PI * 2,
      );
      scene.ctx.stroke();
    } else {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2,
          dist = 9 + progress * 48;
        scene.ctx.lineWidth = i % 2 ? 1.5 : 3;
        scene.ctx.beginPath();
        scene.ctx.moveTo(
          Math.cos(angle) * dist * 0.25,
          Math.sin(angle) * dist * 0.25,
        );
        scene.ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        scene.ctx.stroke();
      }
      scene.ctx.strokeStyle = "#ffffff";
      scene.ctx.lineWidth = 2;
      scene.ctx.beginPath();
      scene.ctx.arc(0, 0, 5 + progress * 27, 0, Math.PI * 2);
      scene.ctx.stroke();
    }
    scene.ctx.shadowBlur = 0;
    scene.ctx.textAlign = "center";
    scene.ctx.font =
      "bold " +
      (effect.type === "impact" ? 38 : 26) +
      'px "Segoe UI",sans-serif';
    scene.ctx.fillText(effect.text || "", 0, -55 - progress * 35);
    scene.ctx.restore();
  }
  scene.state.fx = scene.state.fx.filter((e) => e.life > 0);
}
