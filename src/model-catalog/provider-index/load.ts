import { normalizeJoopoProviderIndex } from "./normalize.js";
import { JOOPO_PROVIDER_INDEX } from "./joopo-provider-index.js";
import type { JoopoProviderIndex } from "./types.js";

export function loadJoopoProviderIndex(
  source: unknown = JOOPO_PROVIDER_INDEX,
): JoopoProviderIndex {
  return normalizeJoopoProviderIndex(source) ?? { version: 1, providers: {} };
}
