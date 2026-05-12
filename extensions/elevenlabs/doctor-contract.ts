import type { ChannelDoctorLegacyConfigRule } from "joopo/plugin-sdk/channel-contract";
import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { isRecord } from "joopo/plugin-sdk/text-runtime";
import { ELEVENLABS_TALK_PROVIDER_ID, migrateElevenLabsLegacyTalkConfig } from "./config-compat.js";

export function hasLegacyTalkFields(value: unknown): boolean {
  const talk = isRecord(value) ? value : null;
  if (!talk) {
    return false;
  }
  return ["voiceId", "voiceAliases", "modelId", "outputFormat", "apiKey"].some((key) =>
    Object.prototype.hasOwnProperty.call(talk, key),
  );
}

export const legacyConfigRules: ChannelDoctorLegacyConfigRule[] = [
  {
    path: ["talk"],
    message:
      "talk.voiceId/talk.voiceAliases/talk.modelId/talk.outputFormat/talk.apiKey are legacy; use talk.providers.<provider> and run joopo doctor --fix.",
    match: hasLegacyTalkFields,
  },
];

export const ELEVENLABS_TALK_LEGACY_CONFIG_RULES = legacyConfigRules;

export function normalizeCompatibilityConfig({ cfg }: { cfg: JoopoConfig }): {
  config: JoopoConfig;
  changes: string[];
} {
  return migrateElevenLabsLegacyTalkConfig(cfg);
}

export { ELEVENLABS_TALK_PROVIDER_ID };
