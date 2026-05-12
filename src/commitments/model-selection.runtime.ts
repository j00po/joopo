import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import type { JoopoConfig } from "../config/config.js";

export function resolveCommitmentDefaultModelRef(params: {
  cfg: JoopoConfig;
  agentId?: string;
}): { provider: string; model: string } {
  return resolveDefaultModelForAgent(params);
}
