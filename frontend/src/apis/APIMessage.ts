import { sendMessage } from "./sendMessage";
export abstract class APIMessage<Response> {
  send(): Promise<Response> {
    return sendMessage<Response>(this);
  }
}
