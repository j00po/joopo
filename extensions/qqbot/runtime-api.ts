export type { ChannelPlugin, JoopoPluginApi, PluginRuntime } from "joopo/plugin-sdk/core";
export type { JoopoConfig } from "joopo/plugin-sdk/config-types";
export type {
  JoopoPluginService,
  JoopoPluginServiceContext,
  PluginLogger,
} from "joopo/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/bridge/runtime.js";
