// Real workspace contract for memory engine foundation concerns.

export {
  resolveAgentContextLimits,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
  resolveSessionAgentId,
} from "./host/joopo-runtime-agent.js";
export {
  resolveMemorySearchConfig,
  resolveMemorySearchSyncConfig,
  type ResolvedMemorySearchConfig,
  type ResolvedMemorySearchSyncConfig,
} from "./host/joopo-runtime-agent.js";
export { parseDurationMs } from "./host/joopo-runtime-config.js";
export { loadConfig } from "./host/joopo-runtime-config.js";
export { resolveStateDir } from "./host/joopo-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/joopo-runtime-config.js";
export {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
} from "./host/joopo-runtime-config.js";
export { root } from "./host/joopo-runtime-io.js";
export { isPathInside } from "./host/fs-utils.js";
export { createSubsystemLogger } from "./host/joopo-runtime-io.js";
export { detectMime } from "./host/joopo-runtime-io.js";
export { resolveGlobalSingleton } from "./host/joopo-runtime-io.js";
export { onSessionTranscriptUpdate } from "./host/joopo-runtime-session.js";
export { splitShellArgs } from "./host/joopo-runtime-io.js";
export { runTasksWithConcurrency } from "./host/joopo-runtime-io.js";
export {
  shortenHomeInString,
  shortenHomePath,
  resolveUserPath,
  truncateUtf16Safe,
} from "./host/joopo-runtime-io.js";
export type { JoopoConfig } from "./host/joopo-runtime-config.js";
export type { SessionSendPolicyConfig } from "./host/joopo-runtime-config.js";
export type { SecretInput } from "./host/joopo-runtime-config.js";
export type {
  MemoryBackend,
  MemoryCitationsMode,
  MemoryQmdConfig,
  MemoryQmdIndexPath,
  MemoryQmdMcporterConfig,
  MemoryQmdSearchMode,
} from "./host/joopo-runtime-config.js";
export type { MemorySearchConfig } from "./host/joopo-runtime-config.js";
