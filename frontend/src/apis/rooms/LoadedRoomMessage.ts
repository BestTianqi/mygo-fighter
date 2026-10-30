import { APIMessage } from "../APIMessage";
import { sendMessage } from "../sendMessage";
export class LoadedRoomMessage extends APIMessage<{ ok: boolean }> {
  constructor(
    public token: string,
    public generation: number,
    public peerId: string,
  ) {
    super();
  }

  // The final loading acknowledgement also initializes the server's GraalJS context.
  override send(): Promise<{ ok: boolean }> {
    return sendMessage(this, 65000);
  }
}
