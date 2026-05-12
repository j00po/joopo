import type { MarkdownTableMode } from "./types.base.js";
import type { JoopoConfig } from "./types.joopo.js";

export type ResolveMarkdownTableModeParams = {
  cfg?: Partial<JoopoConfig>;
  channel?: string | null;
  accountId?: string | null;
};

export type ResolveMarkdownTableMode = (
  params: ResolveMarkdownTableModeParams,
) => MarkdownTableMode;
