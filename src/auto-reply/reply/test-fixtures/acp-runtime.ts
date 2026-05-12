import type { SessionAcpMeta } from "../../../config/sessions/types.js";
import type { JoopoConfig } from "../../../config/types.joopo.js";

export function createAcpTestConfig(overrides?: Partial<JoopoConfig>): JoopoConfig {
  return {
    acp: {
      enabled: true,
      stream: {
        coalesceIdleMs: 0,
        maxChunkChars: 64,
      },
    },
    ...overrides,
  } as JoopoConfig;
}

export function createAcpSessionMeta(overrides?: Partial<SessionAcpMeta>): SessionAcpMeta {
  return {
    backend: "acpx",
    agent: "codex",
    runtimeSessionName: "runtime:1",
    mode: "persistent",
    state: "idle",
    lastActivityAt: Date.now(),
    identity: {
      state: "resolved",
      acpxSessionId: "acpx-session-1",
      source: "status",
      lastUpdatedAt: Date.now(),
    },
    ...overrides,
  };
}
