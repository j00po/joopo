import type { ProviderThinkingProfile } from "joopo/plugin-sdk/plugin-entry";

export function resolveThinkingProfile(): ProviderThinkingProfile {
  return { levels: [{ id: "off" }], defaultLevel: "off" };
}
