import { bandAtlas, bandPortrait } from "../../../../../assets/bandArt";
import type {
  Assets,
  Atlas,
  SpriteFrame,
} from "../../../../../assets/objects/Assets";
import { bandFor } from "../../../../../game/bands";
import { MOVES } from "../../../../../game/combatData";
import { schemeFor } from "../../../../../game/controls";
import type { FighterIdentity } from "../../../../../game/objects/Fighter";
import { finishArtFor } from "../../../functions/finishArtFor";
import type { TouchAction } from "../objects/TouchAction";
import type { TouchActionArtwork } from "../objects/TouchActionArtwork";

type ActionAtlas = Atlas & { actionFrames?: SpriteFrame[] };
type Pose = readonly [ActionAtlas, string | number];

/** Static representative frames; selecting an icon never advances the battle animator. */
export function touchActionArtworkFor(
  assets: Assets,
  fighter: FighterIdentity,
  action: TouchAction,
): TouchActionArtwork {
  const id = fighter.character;
  const band = bandFor(id);
  const identity: FighterIdentity = {
    character: id,
    penguin: band.id === "mygo" && !!fighter.penguin,
    stageForm: band.id === "mujica" && !!fighter.stageForm,
  };
  const form = band.formFor(identity);
  const fallback =
    bandPortrait(assets, id, form)?.portrait ?? assets.characters[id].portrait;
  if (action === "super")
    return {
      kind: "image",
      src: finishArtFor(assets, identity, true),
      fallback,
    };

  let pose: Pose;
  if (band.id !== "mygo") {
    const atlas = bandAtlas(assets, id, form);
    if (action === "transform") {
      pose = [
        bandAtlas(assets, id, identity.stageForm ? "normal" : "stage"),
        "transform-release",
      ];
    } else if (action === "light") pose = [atlas, "jab-1-impact"];
    else if (action === "heavy") pose = [atlas, "heavy-impact"];
    else if (action === "blink") pose = [atlas, "dash-forward"];
    else {
      const slot = { skill1: 0, skill2: 1, skill3: 2 }[action];
      const move = MOVES[schemeFor(identity).base[slot]];
      pose = [
        atlas,
        `${move.visualSlot ?? `skill-${["u", "i", "o"][slot]}`}-impact`,
      ];
    }
  } else if (identity.penguin) {
    pose = [
      assets.penguin,
      {
        light: "flipper-light",
        heavy: "flipper-heavy",
        blink: "dash-forward",
        skill1: "cry-counter",
        skill2: "hey-release",
        skill3: "call-release",
        transform: "transform",
      }[action],
    ];
    // Penguin's blink uses the same forward pose as the battle renderer.
    if (action === "blink") pose = [assets.penguin, "flipper-heavy"];
  } else {
    const poses: Record<Exclude<TouchAction, "super">, Pose>[] = [
      {
        light: [assets.anonNormals, 0],
        heavy: [assets.anonNormals, 2],
        blink: [assets.anonActions, "dash-forward"],
        skill1: [assets.anonActions, "guard-standing"],
        skill2: [assets.anonActions, "sonic-release"],
        skill3: [assets.anonActions, "thrust-impact"],
        transform: [assets.anonActions, "victory"],
      },
      {
        light: [assets.soyoActions, "palm-light"],
        heavy: [assets.soyoActions, "palm-heavy"],
        blink: [assets.soyoActions, "dash-forward"],
        skill1: [assets.soyoTensora, 0],
        skill2: [assets.soyoActions, "cast-release"],
        skill3: [assets.soyoActions, "normal-windup"],
        transform: [assets.soyoActions, "victory"],
      },
      {
        light: [assets.tomoriActions, "mic-light"],
        heavy: [assets.tomoriActions, "mic-heavy"],
        blink: [assets.tomoriActions, "dash-forward"],
        skill1: [assets.tomoriActions, "echo-release"],
        skill2: [assets.tomoriActions, "note-release"],
        skill3: [assets.tomoriActions, "chorus-release"],
        transform: [assets.penguin, "transform"],
      },
      {
        light: [assets.characters[3], "standing-light"],
        heavy: [assets.characters[3], "standing-heavy"],
        blink: [assets.characters[3], "dash-forward"],
        skill1: [assets.characters[3], "rush-impact"],
        skill2: [assets.ranaParfaitActions, "parfait-release"],
        skill3: [assets.characters[3], "solo-release"],
        transform: [assets.characters[3], "victory"],
      },
      {
        light: [assets.characters[4], "standing-light"],
        heavy: [assets.characters[4], "standing-heavy"],
        blink: [assets.characters[4], "dash-forward"],
        skill1: [assets.characters[4], "roll-release"],
        skill2: [assets.characters[4], "ground-shock"],
        skill3: [assets.characters[4], "eight-beat-release"],
        transform: [assets.characters[4], "victory"],
      },
    ];
    pose = poses[id][action];
  }
  const [atlas, name] = pose;
  const frame =
    typeof name === "number"
      ? atlas.frames[name]
      : (atlas.actionFrames ?? atlas.frames).find(
          (entry) => entry.name === name,
        );
  return frame
    ? { kind: "sprite", src: atlas.atlas, frame, fallback }
    : { kind: "image", src: fallback, fallback };
}
