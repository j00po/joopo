import { readStringOrNumberParam, readStringParam } from "joopo/plugin-sdk/channel-actions";
import type { JoopoConfig } from "joopo/plugin-sdk/config-types";

export { resolveReactionMessageId } from "joopo/plugin-sdk/channel-actions";
export { handleWhatsAppAction } from "./action-runtime.js";
export { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "./normalize.js";
export { readStringOrNumberParam, readStringParam, type JoopoConfig };
