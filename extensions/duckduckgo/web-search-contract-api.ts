import type { WebSearchProviderPlugin } from "joopo/plugin-sdk/provider-web-search-contract";
import { createDuckDuckGoWebSearchProviderBase } from "./src/ddg-search-provider.shared.js";

export function createDuckDuckGoWebSearchProvider(): WebSearchProviderPlugin {
  return {
    ...createDuckDuckGoWebSearchProviderBase(),
    createTool: () => null,
  };
}
