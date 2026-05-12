import type { JoopoConfig } from "../config/types.joopo.js";
import { DEFAULT_PROVIDER } from "./defaults.js";
import { resolveStaticAllowlistModelKey } from "./model-ref-shared.js";

export function ensureStaticModelAllowlistEntry(params: {
  cfg: JoopoConfig;
  modelRef: string;
  defaultProvider?: string;
}): JoopoConfig {
  const rawModelRef = params.modelRef.trim();
  if (!rawModelRef) {
    return params.cfg;
  }

  const models = { ...params.cfg.agents?.defaults?.models };
  const keySet = new Set<string>([rawModelRef]);
  const canonicalKey = resolveStaticAllowlistModelKey(
    rawModelRef,
    params.defaultProvider ?? DEFAULT_PROVIDER,
  );
  if (canonicalKey) {
    keySet.add(canonicalKey);
  }

  for (const key of keySet) {
    models[key] = {
      ...models[key],
    };
  }

  return {
    ...params.cfg,
    agents: {
      ...params.cfg.agents,
      defaults: {
        ...params.cfg.agents?.defaults,
        models,
      },
    },
  };
}
