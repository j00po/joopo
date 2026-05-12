import { buildManifestModelProviderConfig } from "joopo/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "joopo/plugin-sdk/provider-model-shared";
import manifest from "./joopo.plugin.json" with { type: "json" };

export function buildMistralProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "mistral",
    catalog: manifest.modelCatalog.providers.mistral,
  });
}
