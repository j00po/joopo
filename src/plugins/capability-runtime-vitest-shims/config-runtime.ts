import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { JoopoConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): JoopoConfig | null {
  return null;
}
