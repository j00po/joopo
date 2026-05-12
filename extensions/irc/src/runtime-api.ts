// Private runtime barrel for the bundled IRC extension.
// Keep this barrel thin and generic-only.

export type { BaseProbeResult } from "joopo/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "joopo/plugin-sdk/channel-core";
export type { JoopoConfig } from "joopo/plugin-sdk/config-types";
export type { PluginRuntime } from "joopo/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "joopo/plugin-sdk/runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "joopo/plugin-sdk/config-types";
export type { OutboundReplyPayload } from "joopo/plugin-sdk/reply-payload";
export { DEFAULT_ACCOUNT_ID } from "joopo/plugin-sdk/account-id";
export { buildChannelConfigSchema } from "joopo/plugin-sdk/channel-config-primitives";
export {
  PAIRING_APPROVED_MESSAGE,
  buildBaseChannelStatusSummary,
} from "joopo/plugin-sdk/channel-status";
export { createChannelPairingController } from "joopo/plugin-sdk/channel-pairing";
export { createAccountStatusSink } from "joopo/plugin-sdk/channel-lifecycle";
export {
  readStoreAllowFromForDmPolicy,
  resolveEffectiveAllowFromLists,
} from "joopo/plugin-sdk/channel-policy";
export { resolveControlCommandGate } from "joopo/plugin-sdk/command-auth";
export { dispatchChannelMessageReplyWithBase } from "joopo/plugin-sdk/channel-message";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";
export {
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "joopo/plugin-sdk/reply-payload";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "joopo/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "joopo/plugin-sdk/dangerous-name-runtime";
export { logInboundDrop } from "joopo/plugin-sdk/channel-inbound";
