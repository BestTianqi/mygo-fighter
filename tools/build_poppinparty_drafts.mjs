import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { evaluate } from "../scripts/kernel.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const actionManifest = JSON.parse(
  await readFile(
    path.join(root, "assets/poppinparty/actions/manifest.json"),
    "utf8",
  ),
);
const voiceManifest = JSON.parse(
  await readFile(
    path.join(root, "assets/poppinparty/voices/sources.json"),
    "utf8",
  ),
);
const voiceFor = (character, slot) =>
  voiceManifest.clips.find(
    (clip) => clip.character === character && clip.slot === slot.toLowerCase(),
  );
const { createPoppinPartyMoves, POPPINPARTY_ACTIONS, POPPINPARTY_KEYS } =
  await evaluate("frontend/src/game/bands/poppinparty/draftMoves.ts", [
    "createPoppinPartyMoves",
    "POPPINPARTY_ACTIONS",
    "POPPINPARTY_KEYS",
  ]);
// These IDs exist only inside this exporter. Strip them from the offline data;
// integration must supply IDs from the then-current registry.
const moves = createPoppinPartyMoves(
  Object.fromEntries(POPPINPARTY_KEYS.map((key, i) => [key, i])),
);
const descriptions = {
  kasumi: [
    "右手拨弦，一枚粉红星形音波向前直飞；单次命中18伤害，最大射程850。",
    "踏步前进140距离，先短拨再反向扫弦；两段10＋14，总计24伤害。末段击退。",
    "吉他共鸣在自身周围扩散三次；半径300、每段8，总计24伤害。",
    "举起星形吉他，五次星环向周围扩散；判定半径520、每段10，总计50伤害，0.8秒内释放完五段。",
  ],
  tae: [
    "右手两次交替拨弦，射出两道蓝色窄弦波；每道9，总计18伤害。",
    "滑步110距离接三次不同方向扫弦；8＋8＋10，总计26伤害。",
    "琴颈上扬，两道兔耳形弦光合拢；前方230、高度360，造成26伤害并挑飞、击倒。",
    "双手高速演奏，向前发射五道蓝色和弦波；每道10，总计50伤害，0.74秒内发完，飞行仍按正常速度。",
  ],
  rimi: [
    "拨动贝斯，抛出巧克力螺旋面包；沿弧线飞行，单次命中20伤害。面包是投射物，不恢复生命。",
    "先勾弦再掌根闷弦，打出两次前方低音冲击；11＋13，总计24伤害，需低位防御。",
    "抱稳贝斯前进90距离，重拨推出低音圆盘；造成26伤害、强击退并击倒。",
    "站稳连弹，粉色低音环在周身五次扩散，伴随巧克力色螺旋纹；半径500，每段10，总计50伤害。",
  ],
  saaya: [
    "两根鼓棒依次前敲，放出两枚金色鼓点；每枚10，总计20伤害。",
    "双棒交叉防守，80～420毫秒内抵挡正面非投技攻击，并打出26伤害反击鼓波；未被打中则在窗口结束后放出13伤害弱鼓波。背后与投技不触发反击。",
    "敲击鼓面立起身前金色护罩，吸收30伤害、持续3秒；只挡正面，投技绕过护罩。不会回复生命。",
    "双棒左右交替连击，周身460范围连续六次鼓面震荡；前五次各8、末次10，总计50伤害，0.8秒释放完。",
  ],
  arisa: [
    "单手压键，向前推出一排紫色琴键；造成18伤害。",
    "伸手标出前方最多420距离内的敌人脚下，预警380毫秒后落键一次；半径170、伤害25、硬直650毫秒，可走出预警圈躲避。只判定预警所处地面／平台及其上方280高度。",
    "不耐烦地双手外推，紫色矩形键幕震退周围敌人；半径300、伤害24、强击退。",
    "展开流星堂键盘阵，锁定释放时前方最多420距离内的位置；半径220内五次落键，每次10，总计50伤害。位置固定、不是必中，能离开范围躲避。",
  ],
};
const archetypes = {
  kasumi: "均衡突进／周身压制",
  tae: "高速连击／对空",
  rimi: "抛射牵制／低段击退",
  saaya: "反击防护／节奏压制",
  arisa: "预警控场／距离管理",
};
const all = [];
for (const key of POPPINPARTY_KEYS) {
  const specPath = path.join(root, `docs/characters/${key}.json`);
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const portrait = `assets/poppinparty/portraits/${key}.png`;
  await access(path.join(root, portrait));
  const form = spec.forms[0],
    actions = POPPINPARTY_ACTIONS[key];
  spec.design.allowAutoDesign = false;
  spec.design.archetype = archetypes[key];
  spec.design.skillTheme = `${archetypes[key]}；技能为基于动画、乐器和性格创作的格斗招式，不声称原作存在这些战斗能力。`;
  spec.design.constraints[0] =
    "本次制作立绘和离线技能包；用户要求暂不加入游戏。";
  form.appearance =
    "已绘制花咲川校服立绘，原作2D面部、正常身材；独立透明PNG，持各自乐器（沙绫持鼓棒、有咲用按键手势）。";
  form.portraitReference = portrait;
  form.attacks.J.chain = actions.j;
  form.attacks.K.description = actions.k;
  form.entry.description = actions.entry;
  form.ultimateFinish.description = `${actions.finish}。此项为后续奥义图构图方案，本次未另绘奥义图。`;
  form.ultimateFinish.artReference = portrait;
  const catalog = {};
  for (const [id, move] of Object.entries(moves).filter(([id]) =>
    id.startsWith(`poppinparty_${key}_`),
  )) {
    const { ownerCharacter: _owner, ...definition } = move;
    catalog[id] = definition;
  }
  for (const [i, slot] of ["U", "I", "O", "P"].entries()) {
    const move = moves[`poppinparty_${key}_${slot.toLowerCase()}`];
    const hits = move.pulses?.length ?? move.shots?.length ?? 1;
    const damage =
      move.pulses?.reduce((n, p) => n + p.damage, 0) ??
      move.damage * (move.shots?.length ?? 1);
    form.skills[slot] = {
      name: move.name,
      type: move.counter
        ? "counter"
        : move.durability
          ? "shield"
          : move.projectile
            ? "projectile"
            : move.omni || move.targetArea || move.delayedArea
              ? "area"
              : "melee",
      description: descriptions[key][i],
      cost: move.cost,
      totalDamage: damage,
      hits,
      startupMs: move.start,
      recoveryMs: move.duration - move.end,
      cooldownMs: move.recast,
      voiceKey: voiceFor(key, slot).key,
    };
    if (move.counter)
      form.skills[slot].totalDamage = moves[move.counterAttack].damage;
  }
  for (const slot of ["U", "I", "O"]) {
    const move = moves[`poppinparty_${key}_back${slot.toLowerCase()}`];
    form.backwardSkills[slot] =
      `${move.name}：消耗${move.cost}，${slot === "O" ? "向前抛射" : "向前发波"}，伤害${move.damage}。后退以人物朝向为准。`;
  }
  spec.media = [
    {
      key: "portrait-normal",
      kind: "image",
      localPath: portrait,
      sourceUrl: "",
      notes:
        "内置image_gen依据官方校服参考新绘；完整提示词和参考来源见 assets/poppinparty/prompts.json。未导出到游戏运行素材。",
    },
  ];
  for (const voice of voiceManifest.clips.filter(
    (clip) => clip.character === key,
  )) {
    const localPath = `assets/poppinparty/voices/${voice.file}`;
    await access(path.join(root, localPath));
    spec.media.push({
      key: voice.key,
      kind: "voice",
      localPath,
      sourceUrl: voice.sourceUrl,
      speaker: voice.speaker,
      line: voice.lineJapanese,
      startSeconds: voice.startSeconds,
      endSeconds: voice.endSeconds,
      notes: `${voice.lineChinese}；官方游戏原声，原速，保留原片背景音。`,
    });
  }
  form.entry.voiceKey = voiceFor(key, "entry").key;
  form.ultimateFinish.voiceKey = voiceFor(key, "finish").key;
  for (const file of new Set(
    Object.values(actionManifest.characters[key].frames).map(
      (frame) => frame.file,
    ),
  )) {
    const localPath = `assets/poppinparty/actions/${file}`;
    await access(path.join(root, localPath));
    spec.media.push({
      key: `action-${file.replace(/\.png$/, "")}`,
      kind: "image",
      localPath,
      sourceUrl: "",
      notes:
        "已绘制关键姿势；取图矩形、轮廓与统一比例见 actions/manifest.json。",
    });
  }
  spec.notes = [
    "状态：立绘与离线技能定义已制作，未接入游戏；没有分配运行时ID。",
    "技能工厂：frontend/src/game/bands/poppinparty/draftMoves.ts；不被正式注册表导入。",
    "J三段伤害5／6／8，范围200；K伤害13、范围240。L沿用10共鸣虚影瞬移，H未启用。",
    "技能表为基础伤害，普通攻击与小技能受共享连击衰减影响。P消耗100，无防御或减伤时完整命中50伤害，不受连击衰减；释放时霸体。多段共鸣沿用共享预算。",
    "已绘制16种关键动作姿势：待机、行走、奔跑、跳跃、防御、受击、倒地、入场、J三段、K、U/I/O/P。取图清单见 assets/poppinparty/actions/manifest.json。它们是关键姿势，尚非每招完整逐帧动画。",
    "已配入场、U/I/O/P和终结的6条官方游戏原声，保持原速及完整短句；后退派生复用对应基础技能语音。未另绘奥义背景图。",
    "仅在用户后续明确要求加入游戏后注册，并完成按键、动作渲染、音视频和联机接入。",
  ];
  await writeFile(specPath, JSON.stringify(spec, null, 2) + "\n");
  all.push({
    key,
    identity: spec.identity,
    form,
    moves: catalog,
    archetype: archetypes[key],
    voices: voiceManifest.clips.filter((clip) => clip.character === key),
  });
}
await writeFile(
  path.join(root, "assets/poppinparty/skills.json"),
  JSON.stringify({ status: "offline-unregistered", characters: all }, null, 2) +
    "\n",
);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const voicePlayer = (key, slot) => {
  const v = voiceFor(key, slot);
  const label = { entry: "入场", finish: "终结" }[slot] ?? slot.toUpperCase();
  return `<div class="voice"><audio controls preload="none" src="voices/${v.file}" aria-label="${v.speaker}${label}语音"></audio><small>${escape(v.lineChinese)} <a href="${v.sourceUrl}" target="_blank" rel="noreferrer">来源</a></small></div>`;
};
const gallery = `<div class="gallery" aria-label="五人立绘总览">${all.map((c) => `<a href="#${c.key}"><img src="portraits/${c.key}.png" alt="${c.identity.name}"><b>${c.identity.name}</b></a>`).join("")}</div>`;
const actionWidget = (key) =>
  `<div class="action-widget" data-action-character="${key}"><canvas width="480" height="520" role="img" aria-label="动作图预览"></canvas><div class="action-controls"><label>选择动作 <select aria-label="${key}动作">${Object.entries(
    actionManifest.characters[key].frames,
  )
    .map(([id, frame]) => `<option value="${id}">${frame.label}</option>`)
    .join(
      "",
    )}</select></label><button type="button" data-play-pose>播放动作与语音</button><button type="button" data-play-combo>J三段连播</button><a href="portraits/${key}.png" target="_blank">高清立绘</a><p role="status" aria-live="polite">载入动作图…</p></div></div>`;
const sections = all
  .map(
    ({ key, identity, form, archetype }) =>
      `<section id="${key}" style="--accent:${identity.color}"><div class="portrait"><img src="portraits/${key}.png" alt="${identity.name}全身校服立绘" loading="lazy">${actionWidget(key)}</div><article><p class="eyebrow">POPPIN'PARTY / ${identity.role}</p><h2>${identity.name}</h2><p class="role">${archetype}</p><div class="normals"><b>J 三段普攻 · 5 / 6 / 8</b><ol>${form.attacks.J.chain.map((x) => `<li>${escape(x)}</li>`).join("")}</ol><p><b>K 重击 · 13</b>　${escape(form.attacks.K.description)}</p></div><div class="skills">${Object.entries(
        form.skills,
      )
        .map(
          ([slot, s]) =>
            `<div class="skill"><kbd>${slot}</kbd><div><h3>${escape(s.name)}</h3><p class="stats">${s.cost} 共鸣 · ${s.type === "shield" ? "30 护盾 / 3 秒" : s.type === "counter" ? "反击 26 / 落空 13" : s.totalDamage + " 基础伤害 / " + s.hits + " 段"} · 前摇 ${s.startupMs}ms</p><p>${escape(s.description)}</p>${voicePlayer(key, slot)}</div></div>`,
        )
        .join(
          "",
        )}</div><details><summary>后退派生与入场</summary>${Object.entries(
        form.backwardSkills,
      )
        .map(([slot, s]) => `<p><b>后退＋${slot}</b> ${escape(s)}</p>`)
        .join(
          "",
        )}<p><b>入场设计：</b>${escape(form.entry.description)}</p><p><b>入场语音</b></p>${voicePlayer(key, "entry")}<p><b>终结语音</b></p>${voicePlayer(key, "finish")}</details></article></section>`,
  )
  .join("\n");
await writeFile(
  path.join(root, "assets/poppinparty/preview.html"),
  `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poppin'Party · 角色制作预览</title><style>
.action-widget{border-top:1px solid #474150;padding:10px}.action-widget canvas{display:block;width:100%;height:auto}.action-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px}.action-controls button,.action-controls select{font:inherit;color:inherit;background:#39364a;border:1px solid #736078;border-radius:8px;padding:8px;max-width:100%}.action-controls p{margin:0;color:#c9bdd2}.voice{margin-top:12px}.voice audio{display:block;width:100%;max-width:340px;height:34px}.voice small{display:block;color:#beb8c9;margin-top:8px}.skill>div{min-width:0;flex:1}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:25px 0 35px}.gallery a{display:block;min-width:0;background:#252737;border-radius:12px;text-align:center;text-decoration:none;padding-bottom:15px}.gallery img{width:100%;display:block}.gallery b{font-size:14px}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:70px}body{margin:0;background:#151827;color:#f6f1eb;font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}header,main,footer{max-width:1280px;margin:auto;padding:30px}header{padding-top:55px}h1{font-size:clamp(32px,6vw,64px);line-height:1.1;margin:10px 0 20px;letter-spacing:-2px}.eyebrow{font-size:12px;letter-spacing:2px;color:#d7a7bc}.lead{color:#c0bfca;max-width:720px}nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}nav a{padding:8px 17px;border:1px solid #535063;border-radius:30px;color:inherit;text-decoration:none}nav a:hover{background:#343046}section{display:grid;grid-template-columns:minmax(260px,42%) 1fr;gap:36px;border-top:1px solid #494151;padding:40px 0;align-items:start}.portrait{position:sticky;top:25px;border-radius:24px;background:radial-gradient(ellipse at 50% 45%,#3f354c,#202333 70%);overflow:hidden}.portrait>img{display:none;width:100%;height:auto}h2{font-size:34px;line-height:1.2;margin:0}.role{color:var(--accent);font-weight:bold}.normals,details{background:#202333;padding:15px 20px;border-radius:12px;margin:18px 0}.normals p,ol{margin:8px 0}ol{padding-left:20px}.skill{display:flex;gap:15px;padding:18px 0;border-bottom:1px solid #343344}.skill kbd{background:var(--accent);color:white;border-radius:10px;font:bold 22px system-ui;width:44px;height:44px;display:grid;place-items:center;flex-shrink:0}.skill h3{margin:0;font-size:19px}.skill p{margin:6px 0;color:#d0cdd8}.skill .stats{color:var(--accent);font-size:13px}summary{cursor:pointer}footer{color:#aaa5b6}a{color:#eab7cf}@media(max-width:700px){header,main,footer{padding:20px}section{grid-template-columns:1fr;gap:24px}.portrait{position:static;max-width:420px;margin:auto;width:100%}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style><header><p class="eyebrow">CHARACTER COLLECTION · 01</p><h1>Poppin'Party</h1><p class="lead">五位成员的独立校服立绘与技能制作预览。立绘采用正常身材与原作面部风格，招式围绕乐器、性格与动画意象创作。</p><p class="lead">当前为离线素材包，尚未加入游戏。页面可直接在浏览器打开；实际可玩名单仍为16人。</p><nav>${all.map((c) => `<a href="#${c.key}">${c.identity.name}</a>`).join("")}</nav>${gallery}</header><main>${sections}</main><footer>全员：J范围200，K范围240；L为10共鸣虚影瞬移；H未启用；P释放时霸体。<br>技能表为基础伤害；普通连击会衰减，P全中50仍受防御与减伤影响。<br>已绘制80种关键动作姿势、配30条官方游戏原声；动作演示为关键姿势切换，可按技能试听。<br><a href="https://gamebiz.jp/news/366083">官方校服视觉参考出处</a> · 图片由内置 image_gen 生成，提示词见同目录 prompts.json。</footer><script id="action-data" type="application/json">${JSON.stringify(actionManifest).replace(/</g, "\u003c")}</script><script id="skill-data" type="application/json">${JSON.stringify(all).replace(/</g, "\u003c")}</script><script src="actions/preview.js"></script><script>document.addEventListener("play",event=>{if(event.target.tagName!=="AUDIO")return;for(const audio of document.querySelectorAll("audio")){if(audio!==event.target){audio.pause();audio.currentTime=0}}event.target.playbackRate=1},true)</script></html>`,
);
console.log(
  `Exported ${all.length} offline characters, ${Object.keys(moves).length} move definitions; no runtime registration.`,
);
