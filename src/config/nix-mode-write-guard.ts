import { resolveIsNixMode } from "./paths.js";

export const NIX_JOOPO_AGENT_FIRST_URL = "https://github.com/joopo/nix-joopo#quick-start";
export const JOOPO_NIX_OVERVIEW_URL = "https://docs.joopo.ai/install/nix";

export class NixModeConfigMutationError extends Error {
  readonly code = "JOOPO_NIX_MODE_CONFIG_IMMUTABLE";

  constructor(params: { configPath?: string } = {}) {
    super(formatNixModeConfigMutationMessage(params));
    this.name = "NixModeConfigMutationError";
  }
}

export function formatNixModeConfigMutationMessage(params: { configPath?: string } = {}): string {
  return [
    "Config is managed by Nix (`JOOPO_NIX_MODE=1`), so Joopo treats joopo.json as immutable.",
    "This usually means nix-joopo, the first-party Nix distribution, or another Nix-managed package set this mode.",
    ...(params.configPath ? [`Config path: ${params.configPath}`] : []),
    "Do not run setup, onboarding, joopo update, plugin install/update/uninstall/enable, doctor repair/token-generation, or config set against this file.",
    "Edit the Nix source for this install instead. For nix-joopo, edit `programs.joopo.config` or `instances.<name>.config`, then rebuild with Home Manager or NixOS.",
    `Agent-first Nix setup: ${NIX_JOOPO_AGENT_FIRST_URL}`,
    `Joopo Nix overview: ${JOOPO_NIX_OVERVIEW_URL}`,
  ].join("\n");
}

export function assertConfigWriteAllowedInCurrentMode(
  params: {
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): void {
  if (!resolveIsNixMode(params.env)) {
    return;
  }
  throw new NixModeConfigMutationError({ configPath: params.configPath });
}
