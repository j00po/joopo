// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "joopo/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "joopo/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "joopo/plugin-sdk/channel-config-primitives";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "joopo/plugin-sdk/channel-contract";
export { missingTargetError } from "joopo/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "joopo/plugin-sdk/channel-lifecycle";
export { createChannelPairingController } from "joopo/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "joopo/plugin-sdk/channel-message";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveDmGroupAccessWithLists,
  resolveSenderScopedGroupPolicy,
} from "joopo/plugin-sdk/channel-policy";
export { PAIRING_APPROVED_MESSAGE } from "joopo/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";
export type { JoopoConfig } from "joopo/plugin-sdk/config-types";
export { GoogleChatConfigSchema } from "joopo/plugin-sdk/bundled-channel-config-schema";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "joopo/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "joopo/plugin-sdk/dangerous-name-runtime";
export { fetchRemoteMedia, resolveChannelMediaMaxBytes } from "joopo/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "joopo/plugin-sdk/outbound-media";
export type { PluginRuntime } from "joopo/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "joopo/plugin-sdk/ssrf-runtime";
export type { GoogleChatAccountConfig, GoogleChatConfig } from "joopo/plugin-sdk/config-types";
export { extractToolSend } from "joopo/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "joopo/plugin-sdk/channel-inbound";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "joopo/plugin-sdk/inbound-envelope";
export { resolveWebhookPath } from "joopo/plugin-sdk/webhook-path";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "joopo/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "joopo/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
