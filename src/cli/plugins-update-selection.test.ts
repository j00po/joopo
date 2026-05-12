import { describe, expect, it } from "vitest";
import type { PluginInstallRecord } from "../config/types.plugins.js";
import { resolvePluginUpdateSelection } from "./plugins-update-selection.js";

function createNpmInstall(params: {
  spec: string;
  installPath?: string;
  resolvedName?: string;
}): PluginInstallRecord {
  return {
    source: "npm",
    spec: params.spec,
    installPath: params.installPath ?? "/tmp/plugin",
    ...(params.resolvedName ? { resolvedName: params.resolvedName } : {}),
  };
}

describe("resolvePluginUpdateSelection", () => {
  it("maps an explicit unscoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "joopo-codex-app-server": createNpmInstall({
            spec: "joopo-codex-app-server",
            installPath: "/tmp/joopo-codex-app-server",
            resolvedName: "joopo-codex-app-server",
          }),
        },
        rawId: "joopo-codex-app-server@beta",
      }),
    ).toEqual({
      pluginIds: ["joopo-codex-app-server"],
      specOverrides: {
        "joopo-codex-app-server": "joopo-codex-app-server@beta",
      },
    });
  });

  it("maps an explicit scoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "voice-call": createNpmInstall({
            spec: "@joopo/voice-call",
            installPath: "/tmp/voice-call",
            resolvedName: "@joopo/voice-call",
          }),
        },
        rawId: "@joopo/voice-call@beta",
      }),
    ).toEqual({
      pluginIds: ["voice-call"],
      specOverrides: {
        "voice-call": "@joopo/voice-call@beta",
      },
    });
  });

  it("maps an explicit npm version update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "joopo-codex-app-server": createNpmInstall({
            spec: "joopo-codex-app-server",
            installPath: "/tmp/joopo-codex-app-server",
            resolvedName: "joopo-codex-app-server",
          }),
        },
        rawId: "joopo-codex-app-server@0.2.0-beta.4",
      }),
    ).toEqual({
      pluginIds: ["joopo-codex-app-server"],
      specOverrides: {
        "joopo-codex-app-server": "joopo-codex-app-server@0.2.0-beta.4",
      },
    });
  });

  it("keeps recorded npm tags when update is invoked by plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "joopo-codex-app-server": createNpmInstall({
            spec: "joopo-codex-app-server@beta",
            installPath: "/tmp/joopo-codex-app-server",
            resolvedName: "joopo-codex-app-server",
          }),
        },
        rawId: "joopo-codex-app-server",
      }),
    ).toEqual({
      pluginIds: ["joopo-codex-app-server"],
    });
  });

  it("maps a bare scoped npm package update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "lossless-claw": createNpmInstall({
            spec: "@martian-engineering/lossless-claw@0.9.0",
            installPath: "/tmp/lossless-claw",
            resolvedName: "@martian-engineering/lossless-claw",
          }),
        },
        rawId: "@martian-engineering/lossless-claw",
      }),
    ).toEqual({
      pluginIds: ["lossless-claw"],
      specOverrides: {
        "lossless-claw": "@martian-engineering/lossless-claw",
      },
    });
  });
});
