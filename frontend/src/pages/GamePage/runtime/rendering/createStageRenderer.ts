import type { RenderImage } from "./RenderImage";
import type { Camera } from "./Camera";
import { WORLD, type Match } from "../../../../game/engine";
import type { Assets, Stage } from "../../../../assets/objects/Assets";

/** Stage artwork, atmosphere and terrain share the previous game's parallax. */
export function createStageRenderer(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  camera: Camera,
  getImage: (url: string) => RenderImage | undefined,
  reducedMotion: boolean,
) {
  let battleArena = 0,
    visualTime = 0,
    match: Match;
  function drawStageAtmosphere(stage: Stage) {
    // This layer shares the background's parallax, behind both terrain and fighters.
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
    } else if (id === "studio" || id.endsWith("-studio")) {
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
      ctx.fillStyle = id === "rooftop" ? "#f9c8a710" : "#f4fbff18";
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
  function drawBackground() {
    const magnification = 1.12 + camera.zoom * 0.34,
      width = 960 * magnification,
      height = 540 * magnification;
    const offsetX = Math.max(
      -(width - 960) / 2,
      Math.min((width - 960) / 2, (camera.x - 480) * 0.13 * camera.zoom),
    );
    const offsetY = Math.max(
      -(height - 540) / 2,
      Math.min((height - 540) / 2, (camera.y - 300) * 0.15 * camera.zoom),
    );
    const background = getImage(assets.backgrounds[battleArena]);
    ctx.fillStyle = "#101825";
    ctx.fillRect(0, 0, 960, 540);
    if (background)
      ctx.drawImage(
        background,
        (960 - width) / 2 - offsetX,
        (540 - height) / 2 - offsetY,
        width,
        height,
      );
    ctx.save();
    ctx.translate((960 - width) / 2 - offsetX, (540 - height) / 2 - offsetY);
    ctx.scale(magnification, magnification);
    drawStageAtmosphere(assets.stages[battleArena]);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    const stage = assets.stages[battleArena];
    const ambience =
      {
        sakura: "petals",
        rooftop: "sunset",
        studio: "dust",
        theater: "night",
        rainstreet: "rain",
      }[stage.id] || stage.ambience;
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
  }
  function drawTerrain() {
    const terrain = match.options.terrain || {
      ...assets.stages[battleArena].terrain,
      platforms: [],
      hills: [],
    };
    const [edge, face, dark] = terrain.colors ?? [
      "#b8d2e4",
      "#344c60",
      "#142735",
    ];
    ctx.save();
    // Render the exact height function used by combat, including every ramp.
    {
      const left = WORLD.left - 360,
        right = WORLD.right + 360,
        bottom = 438 - WORLD.bottom + 700;
      const gradient = ctx.createLinearGradient(0, 390, 0, 485);
      gradient.addColorStop(0, face);
      gradient.addColorStop(1, dark);
      ctx.beginPath();
      ctx.moveTo(left, 438 - match.floorHeight(left));
      for (let x = left + 4; x <= right; x += 4)
        ctx.lineTo(x, 438 - match.floorHeight(x));
      ctx.lineTo(right, bottom);
      ctx.lineTo(left, bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      // Texture is clipped to the solid face, leaving every landing edge exact.
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ffffff0b";
      for (let y = 300; y < 700; y += 38) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      for (let x = left; x <= right; x += 4) {
        const y = 438 - match.floorHeight(x);
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      for (let x = left + 24; x < right; x += 96) {
        const y = 438 - match.floorHeight(x);
        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x, y + 100);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (const p of terrain.platforms) {
      const top = 438 - p.height,
        width = p.right - p.left;
      const material = p.style || terrain.material;
      ctx.fillStyle = "#02091650";
      ctx.beginPath();
      ctx.ellipse(
        (p.left + p.right) / 2,
        442 - match.floorHeight((p.left + p.right) / 2),
        width * 0.52,
        8,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Upper walkways rest on the lower decks, keeping supports out of the
      // open fighting lane. The bright top edge remains the exact landing line.
      for (const x of [p.left + 14, p.right - 22]) {
        const support = Math.max(
          match.floorHeight(x),
          ...terrain.platforms
            .filter(
              (below) =>
                below.height < p.height && x >= below.left && x <= below.right,
            )
            .map((below) => below.height),
        );
        const bottom = 438 - support;
        ctx.fillStyle = dark;
        ctx.fillRect(x, top + 15, 8, bottom - top - 15);
        ctx.fillStyle = face;
        ctx.fillRect(x, top + 15, 2, bottom - top - 15);
      }
      if (material === "rail" || material === "roof") {
        ctx.strokeStyle = edge;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.left + 6, top - 34);
        ctx.lineTo(p.right - 6, top - 34);
        for (let x = p.left + 8; x < p.right; x += 32) {
          ctx.moveTo(x, top - 34);
          ctx.lineTo(x, top);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (material === "planter") {
        ctx.fillStyle = "#486e53";
        ctx.fillRect(p.left + 8, top - 8, width - 16, 8);
        ctx.fillStyle = "#8da97b";
        for (let x = p.left + 15; x < p.right - 10; x += 20) {
          ctx.beginPath();
          ctx.ellipse(x, top - 8, 9, 5, -0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const slab = ctx.createLinearGradient(0, top, 0, top + 22);
      slab.addColorStop(0, face);
      slab.addColorStop(1, dark);
      ctx.fillStyle = slab;
      ctx.fillRect(p.left, top, width, 20);
      ctx.fillStyle = edge;
      ctx.fillRect(p.left, top, width, 3);
      ctx.fillStyle = "#00000050";
      ctx.fillRect(p.left, top + 18, width, 3);
      // Small inset fixtures distinguish materials without changing the silhouette.
      if (material === "speaker") {
        ctx.fillStyle = "#080e1690";
        ctx.fillRect(p.left + 7, top + 5, width - 14, 11);
        ctx.fillStyle = "#a6dab8";
        ctx.fillRect(p.right - 14, top + 7, 3, 3);
        ctx.fillStyle = "#86a6be";
        ctx.fillRect(p.right - 20, top + 7, 3, 3);
      } else if (material === "stone" || material === "concrete") {
        ctx.fillStyle = "#ffffff10";
        ctx.fillRect(p.left + 5, top + 5, width - 10, 1);
        if (assets.stages[battleArena].id === "sunshine-night") {
          ctx.fillStyle = "#b9d8e8";
          for (let x = p.left + 20; x < p.right - 10; x += 64)
            ctx.fillRect(x, top + 6, 12, 2);
        }
      } else if (material === "metal" || material === "roof") {
        ctx.fillStyle = "#d6ba7760";
        for (const x of [p.left + 5, p.right - 16]) {
          ctx.beginPath();
          ctx.moveTo(x, top + 5);
          ctx.lineTo(x + 4, top + 5);
          ctx.lineTo(x + 10, top + 15);
          ctx.lineTo(x + 6, top + 15);
          ctx.closePath();
          ctx.fill();
        }
      } else if (material === "wood") {
        ctx.strokeStyle = "#d8bf9240";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(p.left + 9, top + 8);
        ctx.bezierCurveTo(
          p.left + width * 0.3,
          top + 5,
          p.left + width * 0.55,
          top + 12,
          p.right - 9,
          top + 8,
        );
        ctx.stroke();
      } else if (material === "planter") {
        for (let x = p.left + 22; x < p.right - 12; x += 35) {
          ctx.fillStyle =
            assets.stages[battleArena].id === "tsukinomori-garden"
              ? "#ddcaee"
              : "#f2cfb2";
          ctx.beginPath();
          ctx.arc(x, top - 7, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.45;
      const spacing = material === "wood" ? 17 : material === "stone" ? 36 : 25;
      for (let x = p.left + 8; x < p.right - 5; x += spacing) {
        if (material === "speaker") {
          ctx.beginPath();
          ctx.arc(x + 5, top + 11, 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (material === "metal" || material === "roof") {
          ctx.fillStyle = edge;
          ctx.fillRect(x, top + 9, 3, 3);
        } else {
          ctx.beginPath();
          ctx.moveTo(x, top + 4);
          ctx.lineTo(x, top + 17);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  return {
    background(arena: number, time: number) {
      battleArena = arena;
      visualTime = time;
      drawBackground();
    },
    terrain(value: Match, arena: number) {
      match = value;
      battleArena = arena;
      drawTerrain();
    },
  };
}
