import { formatTrimmedAllowFromEntries } from "joopo/plugin-sdk/channel-config-helpers";
import { PAIRING_APPROVED_MESSAGE } from "joopo/plugin-sdk/channel-status";
import {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
} from "joopo/plugin-sdk/core";
import { resolveChannelMediaMaxBytes } from "joopo/plugin-sdk/media-runtime";
import { collectStatusIssuesFromLastError } from "joopo/plugin-sdk/status-helpers";
import { normalizeIMessageMessagingTarget } from "./normalize.js";
export { chunkTextForOutbound } from "joopo/plugin-sdk/text-chunking";

export {
  collectStatusIssuesFromLastError,
  DEFAULT_ACCOUNT_ID,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  normalizeIMessageMessagingTarget,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelMediaMaxBytes,
};

export type { ChannelPlugin };
