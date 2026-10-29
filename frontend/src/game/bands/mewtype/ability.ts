import { normalFor, prefixFor } from "./forms";
import { schemeCommand } from "../shared/command";

export const MEWTYPE_ABILITY = {
  unified: true,
  command: schemeCommand(normalFor, prefixFor),
};
