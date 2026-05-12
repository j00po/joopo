import {
  getRuntimeConfig,
  getRuntimeConfigSourceSnapshot,
  type JoopoConfig,
} from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): JoopoConfig {
  return getRuntimeConfigSourceSnapshot() ?? getRuntimeConfig();
}
