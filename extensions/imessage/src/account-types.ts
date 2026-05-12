import type { JoopoConfig } from "joopo/plugin-sdk/config-types";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<JoopoConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
