import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import {
  resolveRealtimeVoiceFastContextConsult,
  type RealtimeVoiceFastContextConsultResult,
  type RealtimeVoiceFastContextConfig,
} from "joopo/plugin-sdk/realtime-voice";

type Logger = {
  debug?: (message: string) => void;
};

export async function resolveRealtimeFastContextConsult(params: {
  cfg: JoopoConfig;
  agentId: string;
  sessionKey: string;
  config: RealtimeVoiceFastContextConfig;
  args: unknown;
  logger: Logger;
}): Promise<RealtimeVoiceFastContextConsultResult> {
  return await resolveRealtimeVoiceFastContextConsult({
    ...params,
    labels: {
      audienceLabel: "caller",
      contextName: "Joopo memory or session context",
    },
  });
}
