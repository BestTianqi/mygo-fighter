import * as mewtype from "../../mewtype";
import { schemeCommand } from "../shared/command";

export const MEWTYPE_ABILITY = {
  unified: true,
  command: schemeCommand(mewtype.normalFor, mewtype.prefixFor),
};
