// Private runtime barrel for the bundled Microsoft Teams extension.
// Keep this barrel thin and aligned with the local extension surface.

export { DEFAULT_ACCOUNT_ID } from "joopo/plugin-sdk/account-id";
export type { AllowlistMatch } from "joopo/plugin-sdk/allow-from";
export {
  mergeAllowlist,
  resolveAllowlistMatchSimple,
  summarizeMapping,
} from "joopo/plugin-sdk/allow-from";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "joopo/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "joopo/plugin-sdk/channel-core";
export { logTypingFailure } from "joopo/plugin-sdk/channel-logging";
export { createChannelPairingController } from "joopo/plugin-sdk/channel-pairing";
export {
  evaluateSenderGroupAccessForPolicy,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
  resolveSenderScopedGroupPolicy,
  resolveToolsBySender,
} from "joopo/plugin-sdk/channel-policy";
export { createChannelMessageReplyPipeline } from "joopo/plugin-sdk/channel-message";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "joopo/plugin-sdk/channel-status";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "joopo/plugin-sdk/channel-targets";
export type {
  GroupPolicy,
  GroupToolPolicyConfig,
  MSTeamsChannelConfig,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
  MarkdownTableMode,
  JoopoConfig,
} from "joopo/plugin-sdk/config-types";
export { isDangerousNameMatchingEnabled } from "joopo/plugin-sdk/dangerous-name-runtime";
export { resolveDefaultGroupPolicy } from "joopo/plugin-sdk/runtime-group-policy";
export { withFileLock } from "joopo/plugin-sdk/file-lock";
export { keepHttpServerTaskAlive } from "joopo/plugin-sdk/channel-lifecycle";
export {
  detectMime,
  extensionForMime,
  extractOriginalFilename,
  getFileExtension,
  resolveChannelMediaMaxBytes,
} from "joopo/plugin-sdk/media-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "joopo/plugin-sdk/inbound-reply-dispatch";
export { loadOutboundMediaFromUrl } from "joopo/plugin-sdk/outbound-media";
export { buildMediaPayload } from "joopo/plugin-sdk/reply-payload";
export type { ReplyPayload } from "joopo/plugin-sdk/reply-payload";
export type { PluginRuntime } from "joopo/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "joopo/plugin-sdk/runtime";
export type { SsrFPolicy } from "joopo/plugin-sdk/ssrf-runtime";
export { fetchWithSsrFGuard } from "joopo/plugin-sdk/ssrf-runtime";
export { normalizeStringEntries } from "joopo/plugin-sdk/string-normalization-runtime";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "joopo/plugin-sdk/webhook-ingress";
export { setMSTeamsRuntime } from "./src/runtime.js";
