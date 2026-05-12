import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: JoopoConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
