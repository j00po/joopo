import type { JoopoConfig } from "../config/types.joopo.js";
import { parseJoopoHubPluginSpec } from "../infra/joopohub-spec.js";
import type { PluginRecord } from "../plugins/registry.js";

export function resolvePluginUninstallId<
  TPlugin extends Pick<PluginRecord, "id" | "name">,
>(params: {
  rawId: string;
  config: JoopoConfig;
  plugins: TPlugin[];
}): { pluginId: string; plugin?: TPlugin } {
  const rawId = params.rawId.trim();
  const plugin = params.plugins.find((entry) => entry.id === rawId || entry.name === rawId);
  if (plugin) {
    return { pluginId: plugin.id, plugin };
  }

  for (const [pluginId, install] of Object.entries(params.config.plugins?.installs ?? {})) {
    if (
      install.spec === rawId ||
      install.resolvedSpec === rawId ||
      install.resolvedName === rawId ||
      install.marketplacePlugin === rawId
    ) {
      return { pluginId };
    }
  }

  const requestedJoopoHub = parseJoopoHubPluginSpec(rawId);
  if (requestedJoopoHub) {
    for (const [pluginId, install] of Object.entries(params.config.plugins?.installs ?? {})) {
      const installedJoopoHubName =
        install.joopohubPackage ??
        parseJoopoHubPluginSpec(install.spec ?? "")?.name ??
        parseJoopoHubPluginSpec(install.resolvedSpec ?? "")?.name;
      if (installedJoopoHubName === requestedJoopoHub.name) {
        return { pluginId };
      }
    }
  }

  return { pluginId: rawId };
}
