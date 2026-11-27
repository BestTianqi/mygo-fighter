import type { RenderImage } from "./RenderImage";
import { drawArenaArtwork, type StageView } from "./drawArenaArtwork";
import { WORLD, type Match } from "../../../../game/engine";
import type { Assets, Stage } from "../../../../assets/objects/Assets";

/** Paint the traced anime set in the same projection as the fighters. */
export function createStageRenderer(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  getImage: (url: string) => RenderImage | undefined,
  reducedMotion: boolean,
) {
  let battleArena = 0,
    visualTime = 0;
  function drawStageAtmosphere(stage: Stage) {
    // Lights and weather are painted over the set before the fighters.
    const time = reducedMotion ? 0 : visualTime,
      id = stage.id;
    const beam = (
      x: number,
      y: number,
      endX: number,
      endY: number,
      width: number,
      color: string,
    ) => {
      const light = ctx.createLinearGradient(x, y, endX, endY);
      light.addColorStop(0, color);
      light.addColorStop(1, "#ffffff00");
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(endX + width, endY);
      ctx.lineTo(endX - width, endY);
      ctx.closePath();
      ctx.fill();
    };
    ctx.save();
    if (id === "ring" || id === "theater") {
      const theater = id === "theater",
        sway = Math.sin(time * 0.00017) * 32;
      for (let i = 0; i < 4; i++) {
        const x = 145 + i * 220;
        beam(
          x,
          20,
          x + (i % 2 ? -42 : 42) + sway,
          430,
          68,
          theater ? "#d5b3f322" : i % 2 ? "#8de4ec28" : "#ed8cac28",
        );
      }
      if (theater) {
        for (const x of [95, 833]) {
          const curtain = ctx.createLinearGradient(x, 0, x + 32, 0);
          curtain.addColorStop(0, "#160f24c0");
          curtain.addColorStop(0.5, "#54283a80");
          curtain.addColorStop(1, "#140d2300");
          ctx.fillStyle = curtain;
          ctx.fillRect(x, 0, 32, 440);
        }
      }
    } else if (id === "studio" || id === "ring-studio") {
      const cool = id === "ring-studio";
      for (const x of [185, 465, 755])
        beam(x, 30, x + 15, 360, 94, cool ? "#d0dfff14" : "#ffdc9c1d");
    } else if (id === "rainstreet") {
      ctx.strokeStyle = "#bfd7ef39";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 42; i++) {
        const y = ((i * 83 + time * 0.18) % 560) - 20,
          x = (i * 137 - y * 0.15 + 960) % 960;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 16);
      }
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = i % 2 ? "#d98aac" : "#a4d2e0";
        const ripple = reducedMotion ? 14 : (time * 0.018 + i * 13) % 36;
        ctx.beginPath();
        ctx.ellipse(
          95 + i * 183,
          407 + (i % 2) * 35,
          12 + ripple,
          1.5 + ripple * 0.08,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    } else if (id === "rooftop" || id === "haneoka-roof") {
      // Faint upper-sky wisps; no weather layer covers the fighting plane.
      ctx.fillStyle = "#f4fbff18";
      for (let i = 0; i < 3; i++) {
        const x = ((i * 365 + time * 0.003) % 1280) - 160;
        ctx.beginPath();
        ctx.ellipse(x, 46 + i * 25, 155, 12, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (
      [
        "sakura",
        "hanasakigawa",
        "haneoka",
        "tsukinomori",
        "tsukinomori-garden",
      ].includes(id)
    ) {
      const blossom = id === "sakura" || id === "hanasakigawa";
      // Nearby branches frame the corners instead of drawing over school facades.
      for (const side of [0, 1]) {
        ctx.save();
        ctx.translate(side ? 860 : 100, 65);
        ctx.scale(side ? -1 : 1, 1);
        ctx.strokeStyle = "#25423938";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 38);
        ctx.quadraticCurveTo(46, 50, 103, 3);
        ctx.stroke();
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = blossom
            ? i % 2
              ? "#eab6cc42"
              : "#f3d5df54"
            : i % 2
              ? "#4d775b40"
              : "#82a87642";
          ctx.beginPath();
          ctx.ellipse(
            8 + i * 12,
            29 - i * 2 + Math.sin(time * 0.0006 + i) * 2,
            15,
            7,
            -0.35 + i * 0.19,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }
      if (id === "tsukinomori-garden") beam(730, 0, 545, 360, 95, "#f0eed425");
    } else if (id === "sunshine-steps" || id === "sunshine-night") {
      const night = id === "sunshine-night";
      for (const x of [175, 780]) {
        const glow = ctx.createRadialGradient(
          x,
          240,
          1,
          x,
          240,
          night ? 72 : 110,
        );
        glow.addColorStop(0, night ? "#c5ddff1d" : "#ffca8c19");
        glow.addColorStop(1, "#ffffff00");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 110, 130, 220, 220);
      }
    }
    ctx.restore();
  }
  function drawBackground(view: StageView) {
    const stage = assets.stages[battleArena];
    const image = getImage(assets.backgrounds[battleArena]);
    if (!image) {
      ctx.fillStyle = "#101825";
      ctx.fillRect(0, 0, 960, 540);
      return false;
    }
    drawArenaArtwork(ctx, image, stage.artBounds, view);
    const bounds = stage.artBounds;
    ctx.save();
    ctx.translate(
      480 + (bounds.left - view.x) * view.zoom,
      270 + (bounds.top - view.y) * view.zoom,
    );
    ctx.scale(
      (bounds.width * view.zoom) / 960,
      (bounds.height * view.zoom) / 540,
    );
    drawStageAtmosphere(stage);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    const ambience = assets.stages[battleArena].ambience;
    shade.addColorStop(
      0,
      ["petals", "leaves", "breeze"].includes(ambience)
        ? "#07122170"
        : "#071221a0",
    );
    shade.addColorStop(0.25, "#08142215");
    shade.addColorStop(0.7, "#06121d05");
    shade.addColorStop(1, "#061322d9");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 960, 540);
    if (!reducedMotion && ambience !== "rain") {
      for (let i = 0; i < 17; i++) {
        const x =
          (i * 151 + visualTime * (ambience === "breeze" ? 0.025 : 0.007)) %
          960;
        const y =
          150 + ((i * 59) % 260) + Math.sin(visualTime * 0.0006 + i) * 12;
        ctx.globalAlpha = 0.12 + (Math.sin(visualTime * 0.001 + i) + 1) * 0.09;
        ctx.fillStyle =
          {
            petals: "#f3c8d9",
            leaves: "#b8d99b",
            breeze: "#e4f0f5",
            dust: "#e9cfab",
            sunset: "#f2c28a",
            night: "#b9d3f5",
          }[ambience] || (i % 2 ? "#97dcec" : "#f6b9cd");
        if (ambience === "petals" || ambience === "leaves") {
          ctx.beginPath();
          ctx.ellipse(x, y, 3, 1.2, visualTime * 0.0004 + i, 0, Math.PI * 2);
          ctx.fill();
        } else
          ctx.fillRect(
            x,
            y,
            ambience === "breeze" ? 8 : 1.5,
            ambience === "breeze" ? 0.6 : 1.5,
          );
      }
      ctx.globalAlpha = 1;
    }
    return true;
  }
  // A super can replace the set with video. Keep the live landing edges
  // readable during that interval using the same collision data as the match.
  function drawSurfaceCues(match: Match) {
    const terrain = match.options.terrain;
    const ground = terrain?.ground ?? [];
    ctx.save();
    ctx.strokeStyle = "rgba(242,236,222,.55)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#111722";
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(WORLD.left, 438 - match.floorHeight(WORLD.left));
    for (const p of ground) {
      if (p.x > WORLD.left && p.x < WORLD.right) ctx.lineTo(p.x, 438 - p.y);
    }
    ctx.lineTo(WORLD.right, 438 - match.floorHeight(WORLD.right));
    for (const p of terrain?.platforms ?? []) {
      ctx.moveTo(p.left, 438 - p.height);
      ctx.lineTo(p.right, 438 - p.height);
    }
    ctx.stroke();
    ctx.restore();
  }

  return {
    background(arena: number, time: number, view: StageView) {
      battleArena = arena;
      visualTime = time;
      return drawBackground(view);
    },
    drawSurfaceCues,
  };
}
