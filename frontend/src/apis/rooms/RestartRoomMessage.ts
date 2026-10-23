import { APIMessage } from "../APIMessage";
export class RestartRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(public token: string) {
    super();
  }
}
