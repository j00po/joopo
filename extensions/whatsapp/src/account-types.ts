import type { JoopoConfig } from "joopo/plugin-sdk/config-types";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<JoopoConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
