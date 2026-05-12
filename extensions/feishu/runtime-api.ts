// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  JoopoConfig,
  JoopoPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "joopo/plugin-sdk/core";
export type { JoopoConfig as JoopobotConfig } from "joopo/plugin-sdk/core";
export type { RuntimeEnv } from "joopo/plugin-sdk/runtime";
export type { GroupToolPolicyConfig } from "joopo/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "joopo/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "joopo/plugin-sdk/channel-status";
export { buildAgentMediaPayload } from "joopo/plugin-sdk/agent-media-payload";
export { createChannelPairingController } from "joopo/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "joopo/plugin-sdk/channel-message";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "joopo/plugin-sdk/context-visibility-runtime";
export { loadSessionStore, resolveSessionStoreEntry } from "joopo/plugin-sdk/session-store-runtime";
export { readJsonFileWithFallback } from "joopo/plugin-sdk/json-store";
export { createPersistentDedupe } from "joopo/plugin-sdk/persistent-dedupe";
export { normalizeAgentId } from "joopo/plugin-sdk/routing";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "joopo/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
