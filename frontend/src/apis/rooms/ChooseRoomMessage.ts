import { APIMessage } from "../APIMessage";
export class ChooseRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public character?: number,
    public arena?: number,
    public terrain?: boolean,
    public format?: "1v1" | "3v3",
    public team?: number[],
  ) {
    super();
  }
}
