import type { AuthProfileStore, OAuthCredential } from "../agents/auth-profiles/types.js";
import type { ModelProviderAuthMode, ModelProviderConfig } from "../config/types.js";
import type { JoopoConfig } from "../config/types.joopo.js";

export type ProviderResolveSyntheticAuthContext = {
  config?: JoopoConfig;
  provider: string;
  providerConfig?: ModelProviderConfig;
};

export type ProviderSyntheticAuthResult = {
  apiKey: string;
  source: string;
  mode: Exclude<ModelProviderAuthMode, "aws-sdk">;
  expiresAt?: number;
};

export type ProviderResolveExternalOAuthProfilesContext = {
  config?: JoopoConfig;
  agentDir?: string;
  workspaceDir?: string;
  env: NodeJS.ProcessEnv;
  store: AuthProfileStore;
};

export type ProviderResolveExternalAuthProfilesContext =
  ProviderResolveExternalOAuthProfilesContext;

export type ProviderExternalOAuthProfile = {
  profileId: string;
  credential: OAuthCredential;
  persistence?: "runtime-only" | "persisted";
};

export type ProviderExternalAuthProfile = ProviderExternalOAuthProfile;
