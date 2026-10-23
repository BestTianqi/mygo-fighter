import { APIMessage } from "../APIMessage";
export class LobbyRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(public token: string) {
    super();
  }
}
