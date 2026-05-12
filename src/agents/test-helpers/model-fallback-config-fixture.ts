import type { JoopoConfig } from "../../config/types.joopo.js";

export function makeModelFallbackCfg(overrides: Partial<JoopoConfig> = {}): JoopoConfig {
  return {
    agents: {
      defaults: {
        model: {
          primary: "openai/gpt-4.1-mini",
          fallbacks: ["anthropic/claude-haiku-3-5"],
        },
      },
    },
    ...overrides,
  } as JoopoConfig;
}
