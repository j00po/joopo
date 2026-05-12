import {
  buildModelAliasIndex,
  type ModelAliasIndex,
  resolveDefaultModelForAgent,
} from "../../agents/model-selection.js";
import type { JoopoConfig } from "../../config/types.joopo.js";

export function resolveDefaultModel(params: { cfg: JoopoConfig; agentId?: string }): {
  defaultProvider: string;
  defaultModel: string;
  aliasIndex: ModelAliasIndex;
} {
  const mainModel = resolveDefaultModelForAgent({
    cfg: params.cfg,
    agentId: params.agentId,
  });
  const defaultProvider = mainModel.provider;
  const defaultModel = mainModel.model;
  const aliasIndex = buildModelAliasIndex({
    cfg: params.cfg,
    defaultProvider,
  });
  return { defaultProvider, defaultModel, aliasIndex };
}
