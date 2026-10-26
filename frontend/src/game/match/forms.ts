import { bandFor, MOVES } from "../combatData";
import type { Match } from "../engine";

export function endStageForm(match: Match, side: number): void {
  const f = match.fighters[side];
  if (!f.stageForm) return;
  const band = bandFor(f.character);
  f.stageForm = null;
  const form = MOVES[f.attack ?? ""]?.form;
  if (form && band.forms.includes(form) && form !== band.forms[0]) {
    f.attack = null;
    f.contact = false;
    f.hitMarks = [];
    f.cooldown = 0;
    f.vx = 0;
  }
  f.buffer = null;
  f.bufferMs = 0;
  match.events.push({ type: "stageFormEnd", side });
}

export function endPenguin(match: Match, side: number): void {
  const f = match.fighters[side];
  if (!f.penguin) return;
  f.penguin = null;
  const attack = MOVES[f.attack ?? ""];
  if (attack?.penguinOnly || attack?.category === "transformation") {
    f.attack = null;
    f.contact = false;
    f.hitMarks = [];
    f.cooldown = Math.min(f.cooldown, 120);
  }
  f.buffer = null;
  f.bufferMs = 0;
  match.events.push({ type: "penguinEnd", side });
}
