import type { JoopoConfig } from "../config/types.joopo.js";

export type CancelAcpSessionAdmin = (params: {
  cfg: JoopoConfig;
  sessionKey: string;
  reason: string;
}) => Promise<void>;

export type KillSubagentRunAdminResult = {
  found: boolean;
  killed: boolean;
  runId?: string;
  sessionKey?: string;
  cascadeKilled?: number;
  cascadeLabels?: string[];
};

export type KillSubagentRunAdmin = (params: {
  cfg: JoopoConfig;
  sessionKey: string;
}) => Promise<KillSubagentRunAdminResult>;

export type TaskRegistryControlRuntime = {
  getAcpSessionManager: () => {
    cancelSession: CancelAcpSessionAdmin;
  };
  killSubagentRunAdmin: KillSubagentRunAdmin;
};
