import { buildManifestModelProviderConfig } from "joopo/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "joopo/plugin-sdk/provider-model-shared";
import manifest from "./joopo.plugin.json" with { type: "json" };

export function buildTogetherProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "together",
    catalog: manifest.modelCatalog.providers.together,
  });
}
