import {
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
  selectApplicableRuntimeConfig,
} from "joopo/plugin-sdk/runtime-config-snapshot";
import type { JoopoConfig } from "./runtime-api.js";

export function selectDiscordRuntimeConfig(inputConfig: JoopoConfig): JoopoConfig {
  return (
    selectApplicableRuntimeConfig({
      inputConfig,
      runtimeConfig: getRuntimeConfigSnapshot(),
      runtimeSourceConfig: getRuntimeConfigSourceSnapshot(),
    }) ?? inputConfig
  );
}
