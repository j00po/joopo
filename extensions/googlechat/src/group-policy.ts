import { resolveChannelGroupRequireMention } from "joopo/plugin-sdk/channel-policy";
import type { JoopoConfig } from "joopo/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: JoopoConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
