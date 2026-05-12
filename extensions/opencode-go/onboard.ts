import {
  applyAgentDefaultModelPrimary,
  type JoopoConfig,
} from "joopo/plugin-sdk/provider-onboard";

export const OPENCODE_GO_DEFAULT_MODEL_REF = "opencode-go/kimi-k2.6";

export function applyOpencodeGoProviderConfig(cfg: JoopoConfig): JoopoConfig {
  return cfg;
}

export function applyOpencodeGoConfig(cfg: JoopoConfig): JoopoConfig {
  return applyAgentDefaultModelPrimary(
    applyOpencodeGoProviderConfig(cfg),
    OPENCODE_GO_DEFAULT_MODEL_REF,
  );
}
