/**
 * Aggregate QQBot plugin tool registrations.
 *
 * New tools should be added here rather than in the channel-entry contract
 * file so that the plugin-level `index.ts` stays a pure declaration.
 */

import type { JoopoPluginApi } from "joopo/plugin-sdk/core";
import { registerChannelTool } from "./channel.js";
import { registerRemindTool } from "./remind.js";

export function registerQQBotTools(api: JoopoPluginApi): void {
  registerChannelTool(api);
  registerRemindTool(api);
}
