import { getChannelPlugin } from "../../channels/plugins/index.js";
import type { ChannelPlugin } from "../../channels/plugins/types.plugin.js";
import type { ChannelId, ChannelSetupInput } from "../../channels/plugins/types.public.js";
import type { JoopoConfig } from "../../config/types.joopo.js";
import { normalizeAccountId } from "../../routing/session-key.js";

type ChatChannel = ChannelId;

export function applyAccountName(params: {
  cfg: JoopoConfig;
  channel: ChatChannel;
  accountId: string;
  name?: string;
  plugin?: ChannelPlugin;
}): JoopoConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = params.plugin ?? getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountName;
  return apply ? apply({ cfg: params.cfg, accountId, name: params.name }) : params.cfg;
}

export function applyChannelAccountConfig(params: {
  cfg: JoopoConfig;
  channel: ChatChannel;
  accountId: string;
  input: ChannelSetupInput;
  plugin?: ChannelPlugin;
}): JoopoConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = params.plugin ?? getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountConfig;
  if (!apply) {
    return params.cfg;
  }
  return apply({ cfg: params.cfg, accountId, input: params.input });
}
