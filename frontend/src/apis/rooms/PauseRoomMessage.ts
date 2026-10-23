import { APIMessage } from "../APIMessage";
export class PauseRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public paused: boolean,
  ) {
    super();
  }
}
