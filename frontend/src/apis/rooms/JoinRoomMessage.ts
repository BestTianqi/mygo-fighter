import { APIMessage } from "../APIMessage";
import type { SessionResponse } from "./objects";
export class JoinRoomMessage extends APIMessage<SessionResponse> {
  constructor(public code: string) {
    super();
  }
}
