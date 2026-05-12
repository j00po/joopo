import type { JoopoConfig } from "../../config/types.joopo.js";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<JoopoConfig["session"]>> = {},
): NonNullable<JoopoConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}
