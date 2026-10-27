import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { evaluate } from "./kernel.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const drafts = path.join(root, "docs/characters");
const template = path.join(drafts, "character.template.json");
const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const skillTypes = new Set([
  "projectile",
  "melee",
  "area",
  "summon",
  "heal",
  "shield",
  "counter",
  "movement",
  "custom",
]);
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const json = async (file) =>
  JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
const help = `新角色资料工具（不修改游戏名单）
  npm run character:new -- <英文标识> --name "角色名" --work "作品名"
  npm run character:read -- <英文标识或JSON路径>
  npm run character:check -- <英文标识或JSON路径>
  new 可选 --band <代码分组> --out <输出JSON路径>；默认在 docs/characters/ 创建。
  空白技能可由助手设计；填好资料后说“按新角色模板添加 <角色名>”。`;

function validate(spec, characters) {
  const errors = [];
  if (!record(spec)) return ["资料必须是 JSON 对象"];
  if (spec.schemaVersion !== 1) errors.push("schemaVersion 必须为 1");
  if (!record(spec.identity)) return [...errors, "缺少 identity 角色身份"];
  for (const key of ["key", "name", "work"])
    if (!text(spec.identity[key])) errors.push(`identity.${key} 尚未填写`);
  if (text(spec.identity.key) && !slug.test(spec.identity.key))
    errors.push("identity.key 使用小写英文字母、数字及连字符，以字母开头");
  if (characters.some((entry) => entry.key === spec.identity.key))
    errors.push(`identity.key 已被现有角色使用：${spec.identity.key}`);
  if (!record(spec.design) || typeof spec.design.allowAutoDesign !== "boolean")
    errors.push("design.allowAutoDesign 必须为 true 或 false");
  if (!Array.isArray(spec.forms) || !spec.forms.length)
    return [...errors, "forms 至少需要一个形态"];
  const keys = new Set();
  for (const [index, form] of spec.forms.entries()) {
    const prefix = `forms[${index}]`;
    if (!record(form)) {
      errors.push(`${prefix} 必须是形态对象`);
      continue;
    }
    if (!text(form.key) || !slug.test(form.key))
      errors.push(`${prefix}.key 缺失或格式不正确`);
    if (keys.has(form.key)) errors.push(`${prefix}.key 重复：${form.key}`);
    keys.add(form.key);
    if (
      !Array.isArray(form.attacks?.J?.chain) ||
      form.attacks.J.chain.length !== 3
    )
      errors.push(`${prefix}.attacks.J.chain 必须包含三段普攻`);
    for (const slot of ["U", "I", "O", "P"]) {
      const skill = form.skills?.[slot],
        field = `${prefix}.skills.${slot}`;
      if (!record(skill)) {
        errors.push(`${field} 缺失`);
        continue;
      }
      if (!skillTypes.has(skill.type)) errors.push(`${field}.type 不受支持`);
      if (!Number.isFinite(skill.cost) || skill.cost < 0 || skill.cost > 100)
        errors.push(`${field}.cost 必须为 0 到 100 的数值`);
      if (!Number.isInteger(skill.hits) || skill.hits < 1)
        errors.push(`${field}.hits 必须为正整数`);
      for (const key of [
        "totalDamage",
        "startupMs",
        "recoveryMs",
        "cooldownMs",
      ])
        if (
          skill[key] !== null &&
          (!Number.isFinite(skill[key]) || skill[key] < 0)
        )
          errors.push(`${field}.${key} 必须为非负数，待设计时填 null`);
      if (
        spec.design?.allowAutoDesign === false &&
        (!text(skill.name) || !text(skill.description))
      )
        errors.push(`${field} 需要技能名和效果说明，或启用 allowAutoDesign`);
    }
  }
  const transform = spec.transformation;
  if (!record(transform) || typeof transform.enabled !== "boolean")
    errors.push("transformation.enabled 必须为 true 或 false");
  else if (transform.enabled) {
    if (transform.key !== "H") errors.push("transformation.key 应使用 H");
    if (!keys.has(transform.from))
      errors.push("transformation.from 需要对应 forms 中的形态");
    if (!keys.has(transform.to) || transform.to === transform.from)
      errors.push("transformation.to 需要对应另一个已定义形态");
    if (
      !Number.isFinite(transform.cost) ||
      transform.cost < 0 ||
      transform.cost > 100
    )
      errors.push("transformation.cost 必须为 0 到 100 的数值");
    for (const key of ["durationMs", "damageMultiplier", "speedMultiplier"])
      if (!Number.isFinite(transform[key]) || transform[key] <= 0)
        errors.push(`transformation.${key} 必须为正数`);
  }
  if (!Array.isArray(spec.media)) errors.push("media 必须是素材列表");
  else {
    const mediaKeys = new Set();
    for (const [index, media] of spec.media.entries()) {
      if (!record(media) || !text(media.key)) {
        errors.push(`media[${index}].key 缺失`);
        continue;
      }
      if (mediaKeys.has(media.key))
        errors.push(`media[${index}].key 重复：${media.key}`);
      mediaKeys.add(media.key);
      if (
        media.startSeconds != null &&
        (!Number.isFinite(media.startSeconds) || media.startSeconds < 0)
      )
        errors.push(`media[${index}].startSeconds 必须为非负数`);
      if (
        media.endSeconds != null &&
        (!Number.isFinite(media.endSeconds) ||
          media.endSeconds <= (media.startSeconds ?? 0))
      )
        errors.push(`media[${index}].endSeconds 必须晚于起点`);
    }
    for (const [index, form] of spec.forms.entries()) {
      const refs = [
        ...Object.values(form?.skills ?? {}),
        form?.entry,
        form?.ultimateFinish,
      ];
      for (const item of refs)
        if (text(item?.voiceKey) && !mediaKeys.has(item.voiceKey))
          errors.push(
            `forms[${index}] 的 voiceKey 未在 media 定义：${item.voiceKey}`,
          );
    }
  }
  return errors;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      work: { type: "string" },
      band: { type: "string" },
      out: { type: "string" },
      strict: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, target] = positionals;
  if (values.help || !command) {
    console.log(help);
    return;
  }
  if (positionals.length !== 2 || !["new", "read"].includes(command))
    throw new Error(help);
  if (command === "new") {
    if (!slug.test(target))
      throw new Error("英文标识使用小写字母、数字和连字符，例如 new-character");
    const spec = await json(template);
    Object.assign(spec.identity, {
      key: target,
      name: values.name ?? "",
      work: values.work ?? "",
      codeBand: values.band ?? "auto",
    });
    const file = values.out
      ? path.resolve(values.out)
      : path.join(drafts, `${target}.json`);
    await mkdir(path.dirname(file), { recursive: true });
    try {
      await writeFile(file, JSON.stringify(spec, null, 2) + "\n", {
        flag: "wx",
      });
    } catch (error) {
      if (error.code === "EEXIST")
        throw new Error(`资料已存在，保留原文件：${file}`);
      throw error;
    }
    console.log(
      `已创建角色资料：${file}\n填好后运行 npm run character:read -- "${file}"`,
    );
    return;
  }
  if (values.out || values.name || values.work || values.band)
    throw new Error("read 只需要资料标识或文件路径，可附加 --strict");
  const file = slug.test(target)
    ? path.join(drafts, `${target}.json`)
    : path.resolve(target);
  const spec = await json(file);
  const { BANDS, CHARACTERS } = await evaluate(
    "frontend/src/game/bands/index.ts",
    ["BANDS", "CHARACTERS"],
  );
  const characters = CHARACTERS.map(({ id, key, name, bandId }) => ({
    id,
    key,
    name,
    bandId,
  }));
  const nextId = Math.max(...characters.map((entry) => entry.id)) + 1;
  const errors = validate(spec, characters),
    warnings = [];
  const bandId = spec?.identity?.codeBand ?? "auto";
  const band = BANDS.find((entry) => entry.id === bandId);
  const canAppend = band && band.characters.at(-1).id === nextId - 1;
  const registration =
    bandId === "auto"
      ? "choose-band"
      : !band
        ? "new-band"
        : canAppend
          ? "append-to-existing-band"
          : "existing-band-requires-planning";
  if (band && !canAppend)
    warnings.push(
      `分组 ${bandId} 不在编号末尾，不能直接追加；需保留旧角色编号并选择兼容的注册方案。`,
    );
  if (spec?.design?.allowAutoDesign)
    warnings.push(
      "留空的技能与素材说明由助手设计；ready-for-design 表示资料可交给助手，尚未注册为可玩角色。",
    );
  console.log(
    JSON.stringify(
      {
        file,
        status: errors.length ? "draft" : "ready-for-design",
        errors,
        warnings,
        registry: {
          nextId,
          registration,
          bands: BANDS.map(({ id, label }) => ({ id, label })),
          characters,
        },
        specification: spec,
      },
      null,
      2,
    ),
  );
  if (values.strict && errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`角色资料操作失败：${error.message}`);
  process.exitCode = 1;
});
