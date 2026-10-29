import type { Move } from "../../objects/Move";
import * as mutsumiNormal from "./characters/mutsumi/normal";
import * as mutsumiStage from "./characters/mutsumi/stage";
import * as nyamuNormal from "./characters/nyamu/normal";
import * as nyamuStage from "./characters/nyamu/stage";
import * as sakikoNormal from "./characters/sakiko/normal";
import * as sakikoStage from "./characters/sakiko/stage";
import * as uikaNormal from "./characters/uika/normal";
import * as uikaStage from "./characters/uika/stage";
import * as umiriNormal from "./characters/umiri/normal";
import * as umiriStage from "./characters/umiri/stage";
import { registerCounters } from "./shared/registerCounters";
import { registerTransformation } from "./shared/registerTransformation";
const FORMS = [
  umiriNormal,
  umiriStage,
  sakikoNormal,
  sakikoStage,
  uikaNormal,
  uikaStage,
  mutsumiNormal,
  mutsumiStage,
  nyamuNormal,
  nyamuStage,
];
/** Keep normal, skill, super, counter and back-skill pass order stable. */
const MOVES: Record<string, Move> = {};
for (const form of FORMS) form.registerNormals(MOVES);
registerTransformation(MOVES);
for (const form of FORMS) form.registerSkills(MOVES);
for (const form of FORMS) form.registerSuper(MOVES);
registerCounters(MOVES);
for (const form of FORMS) form.registerBackSkills(MOVES);
export { MOVES };
