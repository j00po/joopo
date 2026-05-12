import type { JoopoConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: JoopoConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
