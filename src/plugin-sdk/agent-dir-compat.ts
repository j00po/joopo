import { resolveDefaultAgentDir } from "../agents/agent-scope-config.js";
import { resolveUserPath } from "../utils.js";

/**
 * @deprecated Prefer resolveAgentDir(cfg, agentId) or resolveDefaultAgentDir(cfg).
 * Kept for third-party plugin SDK compatibility.
 */
export function resolveJoopoAgentDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.JOOPO_AGENT_DIR?.trim() || env.PI_CODING_AGENT_DIR?.trim();
  return override ? resolveUserPath(override, env) : resolveDefaultAgentDir({}, env);
}
