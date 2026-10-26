import * as mujica from "../../mujica";
import { schemeCommand } from "../shared/command";

export const MUJICA_ABILITY = {
  unified: true,
  command: schemeCommand(mujica.normalFor, mujica.prefixFor),
};
