import type { JoopoConfig } from "./types.joopo.js";

export type OwnerDisplaySecretRuntimeState = {
  pendingByPath: Map<string, string>;
};

export function retainGeneratedOwnerDisplaySecret(params: {
  config: JoopoConfig;
  configPath: string;
  generatedSecret?: string;
  state: OwnerDisplaySecretRuntimeState;
}): JoopoConfig {
  const { config, configPath, generatedSecret, state } = params;
  if (!generatedSecret) {
    state.pendingByPath.delete(configPath);
    return config;
  }

  state.pendingByPath.set(configPath, generatedSecret);
  return config;
}
