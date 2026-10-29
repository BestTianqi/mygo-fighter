import { normalFor, prefixFor } from "./forms";
import { schemeCommand } from "../shared/command";

export const MUJICA_ABILITY = {
  unified: true,
  command: schemeCommand(normalFor, prefixFor),
};
