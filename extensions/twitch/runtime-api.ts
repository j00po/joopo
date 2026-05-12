// Private runtime barrel for the bundled Twitch extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "joopo/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "joopo/plugin-sdk/channel-core";
export type { OutboundDeliveryResult } from "joopo/plugin-sdk/channel-send-result";
export type { JoopoConfig } from "joopo/plugin-sdk/config-types";
export type { RuntimeEnv } from "joopo/plugin-sdk/runtime";
export type { WizardPrompter } from "joopo/plugin-sdk/setup";
