import { APIMessage } from "../APIMessage";
export class LeaveRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(public token: string) {
    super();
  }
}
