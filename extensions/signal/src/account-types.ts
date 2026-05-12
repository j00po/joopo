import type { JoopoConfig } from "joopo/plugin-sdk/config-types";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<JoopoConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
