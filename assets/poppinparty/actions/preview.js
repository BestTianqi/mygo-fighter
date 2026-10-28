(() => {
  const manifest = JSON.parse(
    document.getElementById("action-data").textContent,
  );
  const definitions = JSON.parse(
    document.getElementById("skill-data").textContent,
  );
  const images = new Map();
  async function load(file) {
    if (!images.has(file)) {
      const image = new Image();
      image.src = `actions/${file}`;
      images.set(
        file,
        image.decode().then(() => image),
      );
    }
    return images.get(file);
  }
  for (const widget of document.querySelectorAll("[data-action-character]")) {
    const key = widget.dataset.actionCharacter;
    const frames = manifest.characters[key].frames;
    const select = widget.querySelector("select");
    const canvas = widget.querySelector("canvas");
    const status = widget.querySelector("[role=status]");
    const context = canvas.getContext("2d");
    let token = 0;
    async function draw(name, ticket = token) {
      const frame = frames[name];
      const image = await load(frame.file);
      if (ticket !== token) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const [x, y, width, height] = frame.rect;
      const scale = Math.min((370 * frame.heightRatio) / height, 420 / width);
      const bottom = name === "jump" ? 402 : 478;
      context.save();
      context.translate(
        (canvas.width - width * scale) / 2 + (frame.mirror ? width * scale : 0),
        bottom - height * scale,
      );
      context.scale(frame.mirror ? -scale : scale, scale);
      context.translate(-x, -y);
      const outline = new Path2D();
      for (const polygon of frame.outlines) {
        polygon.forEach(([px, py], index) => {
          if (index) outline.lineTo(px, py);
          else outline.moveTo(px, py);
        });
        outline.closePath();
      }
      context.clip(outline);
      context.drawImage(image, 0, 0);
      context.restore();
      canvas.dataset.pose = name;
      canvas.setAttribute("aria-label", `${key} ${frame.label}动作图`);
      status.textContent = frame.label;
    }
    const onError = () => {
      status.textContent = "动作图载入失败，请检查同目录素材。";
    };
    select.addEventListener("change", () => {
      token++;
      draw(select.value).catch(onError);
    });
    async function playVoice(slot) {
      const clip = definitions
        .find((c) => c.key === key)
        .voices.find((v) => v.slot === slot);
      if (!clip) return;
      const audio = document.querySelector(`audio[src="voices/${clip.file}"]`);
      audio.currentTime = 0;
      audio.playbackRate = 1;
      await audio.play();
    }
    function animate(cues) {
      const ticket = ++token;
      for (const [at, pose] of cues)
        setTimeout(() => {
          if (ticket === token) draw(pose, ticket).catch(onError);
        }, at);
    }
    widget.querySelector("[data-play-pose]").addEventListener("click", () => {
      const name = select.value;
      const move = definitions.find((c) => c.key === key).moves[
        `poppinparty_${key}_${name}`
      ];
      const start = move?.start ?? 100;
      const duration = move?.duration ?? 900;
      animate([
        [0, "idle"],
        [start, name],
        [duration, "idle"],
      ]);
      if (["u", "i", "o", "p", "entry"].includes(name))
        playVoice(name).catch(() => {
          status.textContent = "请点击语音播放器试听。";
        });
    });
    widget.querySelector("[data-play-combo]").addEventListener("click", () => {
      animate([
        [0, "idle"],
        [80, "j1"],
        [400, "idle"],
        [480, "j2"],
        [800, "idle"],
        [930, "j3"],
        [1330, "idle"],
      ]);
    });
    draw("idle").catch(onError);
  }
})();
