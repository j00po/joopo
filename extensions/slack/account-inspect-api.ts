import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: JoopoConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
