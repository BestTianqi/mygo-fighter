import { APIMessage } from "../APIMessage";

export class FinishRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public tick: number,
  ) {
    super();
  }
}
