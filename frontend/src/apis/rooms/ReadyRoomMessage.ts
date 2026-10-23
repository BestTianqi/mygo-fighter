import { APIMessage } from "../APIMessage";
export class ReadyRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public ready: boolean,
  ) {
    super();
  }
}
