import { setConfigValueAtPath } from "../config/config-paths.js";
import type { DmScope } from "../config/types.base.js";
import type { JoopoConfig } from "../config/types.joopo.js";
import type { ToolProfileId } from "../config/types.tools.js";

export const ONBOARDING_DEFAULT_DM_SCOPE: DmScope = "per-channel-peer";
export const ONBOARDING_DEFAULT_TOOLS_PROFILE: ToolProfileId = "coding";

export function applyLocalSetupWorkspaceConfig(
  baseConfig: JoopoConfig,
  workspaceDir: string,
): JoopoConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
    session: {
      ...baseConfig.session,
      dmScope: baseConfig.session?.dmScope ?? ONBOARDING_DEFAULT_DM_SCOPE,
    },
    tools: {
      ...baseConfig.tools,
      profile: baseConfig.tools?.profile ?? ONBOARDING_DEFAULT_TOOLS_PROFILE,
    },
  };
}

export function applySkipBootstrapConfig(cfg: JoopoConfig): JoopoConfig {
  const next = structuredClone(cfg);
  setConfigValueAtPath(
    next as Record<string, unknown>,
    ["agents", "defaults", "skipBootstrap"],
    true,
  );
  return next;
}
