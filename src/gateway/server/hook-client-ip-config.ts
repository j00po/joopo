import type { JoopoConfig } from "../../config/types.joopo.js";
import type { HookClientIpConfig } from "./hooks-request-handler.js";

export function resolveHookClientIpConfig(cfg: JoopoConfig): HookClientIpConfig {
  return {
    trustedProxies: cfg.gateway?.trustedProxies,
    allowRealIpFallback: cfg.gateway?.allowRealIpFallback === true,
  };
}
