import type { DiscordAccountConfig } from "joopo/plugin-sdk/config-types";

export function resolveDiscordVoiceEnabled(voice: DiscordAccountConfig["voice"]): boolean {
  if (voice?.enabled !== undefined) {
    return voice.enabled;
  }
  return voice !== undefined;
}
