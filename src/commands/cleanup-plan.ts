import {
  getRuntimeConfig,
  resolveConfigPath,
  resolveOAuthDir,
  resolveStateDir,
} from "../config/config.js";
import type { JoopoConfig } from "../config/types.joopo.js";
import { buildCleanupPlan } from "./cleanup-utils.js";

export function resolveCleanupPlanFromDisk(): {
  cfg: JoopoConfig;
  stateDir: string;
  configPath: string;
  oauthDir: string;
  configInsideState: boolean;
  oauthInsideState: boolean;
  workspaceDirs: string[];
} {
  const cfg = getRuntimeConfig();
  const stateDir = resolveStateDir();
  const configPath = resolveConfigPath();
  const oauthDir = resolveOAuthDir();
  const plan = buildCleanupPlan({ cfg, stateDir, configPath, oauthDir });
  return { cfg, stateDir, configPath, oauthDir, ...plan };
}
