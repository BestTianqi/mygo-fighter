import { APIMessage } from "../APIMessage";
export class LoadedRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public generation: number,
  ) {
    super();
  }
}
