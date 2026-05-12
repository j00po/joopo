// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  JoopoConfig,
  JoopoPluginApi,
  PluginRuntime,
} from "joopo/plugin-sdk/core";
export type { RuntimeEnv } from "joopo/plugin-sdk/runtime";
export type { ReplyPayload } from "joopo/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "joopo/plugin-sdk/command-auth";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
} from "joopo/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "joopo/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "joopo/plugin-sdk/channel-status";
export { createAccountStatusSink } from "joopo/plugin-sdk/channel-lifecycle";
export { buildAgentMediaPayload } from "joopo/plugin-sdk/agent-media-payload";
export {
  buildModelsProviderData,
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "joopo/plugin-sdk/command-auth";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "joopo/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "joopo/plugin-sdk/dangerous-name-runtime";
export { loadSessionStore, resolveStorePath } from "joopo/plugin-sdk/session-store-runtime";
export { formatInboundFromLabel } from "joopo/plugin-sdk/channel-inbound";
export { logInboundDrop } from "joopo/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "joopo/plugin-sdk/channel-pairing";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "joopo/plugin-sdk/channel-policy";
export { evaluateSenderGroupAccessForPolicy } from "joopo/plugin-sdk/group-access";
export { createChannelMessageReplyPipeline } from "joopo/plugin-sdk/channel-message";
export { logTypingFailure } from "joopo/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "joopo/plugin-sdk/outbound-media";
export { rawDataToString } from "joopo/plugin-sdk/webhook-ingress";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "joopo/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "joopo/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "joopo/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "joopo/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "joopo/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "joopo/plugin-sdk/setup";
export {
  getAgentScopedMediaLocalRoots,
  resolveChannelMediaMaxBytes,
} from "joopo/plugin-sdk/media-runtime";
export { normalizeProviderId } from "joopo/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
