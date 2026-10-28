import { APIMessage } from "../APIMessage";
import type { BattleRules } from "../../game/objects/BattleRules";
import type { Format } from "../../game/objects/MatchOptions";
export class ChooseRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public character?: number,
    public arena?: number,
    public terrain?: boolean,
    public format?: Format,
    public team?: number[],
    public draft?: boolean,
    public ban?: number,
    public pick?: number,
    public rules?: BattleRules,
  ) {
    super();
  }
}
