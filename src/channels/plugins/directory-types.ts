import type { JoopoConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: JoopoConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
