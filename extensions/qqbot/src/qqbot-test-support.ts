import type { JoopoConfig } from "joopo/plugin-sdk/config-types";

export function makeQqbotSecretRefConfig(): JoopoConfig {
  return {
    channels: {
      qqbot: {
        appId: "123456",
        clientSecret: {
          source: "env",
          provider: "default",
          id: "QQBOT_CLIENT_SECRET",
        },
      },
    },
  } as JoopoConfig;
}

export function makeQqbotDefaultAccountConfig(): JoopoConfig {
  return {
    channels: {
      qqbot: {
        defaultAccount: "bot2",
        accounts: {
          bot2: { appId: "123456" },
        },
      },
    },
  } as JoopoConfig;
}
