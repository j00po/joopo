import type { ChannelDoctorConfigMutation } from "joopo/plugin-sdk/channel-contract";
import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: JoopoConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
