import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import type { CommandArgValues } from "joopo/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<JoopoConfig["channels"]>["discord"];

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
