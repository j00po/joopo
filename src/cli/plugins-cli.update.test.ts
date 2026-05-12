import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JoopoConfig } from "../config/config.js";
import {
  loadConfig,
  refreshPluginRegistry,
  registerPluginsCli,
  resetPluginsCliTestState,
  runPluginsCommand,
  runtimeErrors,
  runtimeLogs,
  setInstalledPluginIndexInstallRecords,
  updateNpmInstalledHookPacks,
  updateNpmInstalledPlugins,
  writeConfigFile,
  writePersistedInstalledPluginIndexInstallRecords,
} from "./plugins-cli-test-helpers.js";

const ORIGINAL_JOOPO_NIX_MODE = process.env.JOOPO_NIX_MODE;

function createTrackedPluginConfig(params: {
  pluginId: string;
  spec: string;
  resolvedName?: string;
}): JoopoConfig {
  return {
    plugins: {
      installs: {
        [params.pluginId]: {
          source: "npm",
          spec: params.spec,
          installPath: `/tmp/${params.pluginId}`,
          ...(params.resolvedName ? { resolvedName: params.resolvedName } : {}),
        },
      },
    },
  } as JoopoConfig;
}

describe("plugins cli update", () => {
  beforeEach(() => {
    resetPluginsCliTestState();
  });

  afterEach(() => {
    if (ORIGINAL_JOOPO_NIX_MODE === undefined) {
      delete process.env.JOOPO_NIX_MODE;
    } else {
      process.env.JOOPO_NIX_MODE = ORIGINAL_JOOPO_NIX_MODE;
    }
  });

  it("shows the dangerous unsafe install override in update help", () => {
    const program = new Command();
    registerPluginsCli(program);

    const pluginsCommand = program.commands.find((command) => command.name() === "plugins");
    const updateCommand = pluginsCommand?.commands.find((command) => command.name() === "update");
    const helpText = updateCommand?.helpInformation() ?? "";

    expect(helpText).toContain("--dangerously-force-unsafe-install");
    expect(helpText).toContain("Bypass built-in dangerous-code update");
    expect(helpText).toContain("blocking for plugins");
  });

  it("refuses plugin updates in Nix mode before package-manager work", async () => {
    const previous = process.env.JOOPO_NIX_MODE;
    process.env.JOOPO_NIX_MODE = "1";
    try {
      await expect(runPluginsCommand(["plugins", "update", "--all"])).rejects.toThrow(
        "JOOPO_NIX_MODE=1",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.JOOPO_NIX_MODE;
      } else {
        process.env.JOOPO_NIX_MODE = previous;
      }
    }

    expect(updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(updateNpmInstalledHookPacks).not.toHaveBeenCalled();
    expect(writeConfigFile).not.toHaveBeenCalled();
  });

  it("updates tracked hook packs through plugins update", async () => {
    const cfg = {
      hooks: {
        internal: {
          installs: {
            "demo-hooks": {
              source: "npm",
              spec: "@acme/demo-hooks@1.0.0",
              installPath: "/tmp/hooks/demo-hooks",
              resolvedName: "@acme/demo-hooks",
            },
          },
        },
      },
    } as JoopoConfig;
    const nextConfig = {
      hooks: {
        internal: {
          installs: {
            "demo-hooks": {
              source: "npm",
              spec: "@acme/demo-hooks@1.1.0",
              installPath: "/tmp/hooks/demo-hooks",
            },
          },
        },
      },
    } as JoopoConfig;

    loadConfig.mockReturnValue(cfg);
    updateNpmInstalledPlugins.mockResolvedValue({
      config: cfg,
      changed: false,
      outcomes: [],
    });
    updateNpmInstalledHookPacks.mockResolvedValue({
      config: nextConfig,
      changed: true,
      outcomes: [
        {
          hookId: "demo-hooks",
          status: "updated",
          message: 'Updated hook pack "demo-hooks": 1.0.0 -> 1.1.0.',
        },
      ],
    });

    await runPluginsCommand(["plugins", "update", "demo-hooks"]);

    expect(updateNpmInstalledHookPacks).toHaveBeenCalledWith(
      expect.objectContaining({
        config: cfg,
        hookIds: ["demo-hooks"],
      }),
    );
    expect(writeConfigFile).toHaveBeenCalledWith(nextConfig);
    expect(refreshPluginRegistry).not.toHaveBeenCalled();
    expect(
      runtimeLogs.some((line) => line.includes("Restart the gateway to load plugins and hooks.")),
    ).toBe(true);
  });

  it("exits when update is called without id and without --all", async () => {
    loadConfig.mockReturnValue({
      plugins: {
        installs: {},
      },
    } as JoopoConfig);

    await expect(runPluginsCommand(["plugins", "update"])).rejects.toThrow("__exit__:1");

    expect(runtimeErrors.at(-1)).toContain("Provide a plugin or hook-pack id, or use --all.");
    expect(updateNpmInstalledPlugins).not.toHaveBeenCalled();
  });

  it("reports no tracked plugins or hook packs when update --all has empty install records", async () => {
    loadConfig.mockReturnValue({
      plugins: {
        installs: {},
      },
    } as JoopoConfig);

    await runPluginsCommand(["plugins", "update", "--all"]);

    expect(updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(updateNpmInstalledHookPacks).not.toHaveBeenCalled();
    expect(runtimeLogs.at(-1)).toBe("No tracked plugins or hook packs to update.");
  });

  it("passes dangerous force unsafe install to plugin updates", async () => {
    const config = createTrackedPluginConfig({
      pluginId: "joopo-codex-app-server",
      spec: "joopo-codex-app-server@beta",
    });
    loadConfig.mockReturnValue(config);
    setInstalledPluginIndexInstallRecords(config.plugins?.installs ?? {});
    updateNpmInstalledPlugins.mockResolvedValue({
      config,
      changed: false,
      outcomes: [],
    });

    await runPluginsCommand([
      "plugins",
      "update",
      "joopo-codex-app-server",
      "--dangerously-force-unsafe-install",
    ]);

    expect(updateNpmInstalledPlugins).toHaveBeenCalledWith(
      expect.objectContaining({
        config,
        pluginIds: ["joopo-codex-app-server"],
        dangerouslyForceUnsafeInstall: true,
      }),
    );
  });

  it("writes updated config when updater reports changes", async () => {
    const cfg = {
      plugins: {
        installs: {
          alpha: {
            source: "npm",
            spec: "@joopo/alpha@1.0.0",
          },
        },
      },
    } as JoopoConfig;
    const nextConfig = {
      plugins: {
        installs: {
          alpha: {
            source: "npm",
            spec: "@joopo/alpha@1.1.0",
          },
        },
      },
    } as JoopoConfig;
    loadConfig.mockReturnValue(cfg);
    setInstalledPluginIndexInstallRecords(cfg.plugins?.installs ?? {});
    updateNpmInstalledPlugins.mockResolvedValue({
      outcomes: [{ status: "ok", message: "Updated alpha -> 1.1.0" }],
      changed: true,
      config: nextConfig,
    });
    updateNpmInstalledHookPacks.mockResolvedValue({
      outcomes: [],
      changed: false,
      config: nextConfig,
    });

    await runPluginsCommand(["plugins", "update", "alpha"]);

    expect(updateNpmInstalledPlugins).toHaveBeenCalledWith(
      expect.objectContaining({
        config: cfg,
        pluginIds: ["alpha"],
        dryRun: false,
      }),
    );
    expect(writePersistedInstalledPluginIndexInstallRecords).toHaveBeenCalledWith(
      nextConfig.plugins?.installs,
    );
    expect(writeConfigFile).toHaveBeenCalledWith({});
    expect(refreshPluginRegistry).toHaveBeenCalledWith({
      config: {},
      installRecords: nextConfig.plugins?.installs,
      reason: "source-changed",
    });
    expect(
      runtimeLogs.some((line) => line.includes("Restart the gateway to load plugins and hooks.")),
    ).toBe(true);
  });

  it("exits non-zero when a plugin update reports an error after persisting successes", async () => {
    const cfg = {
      plugins: {
        installs: {
          alpha: {
            source: "npm",
            spec: "@joopo/alpha@1.0.0",
          },
          beta: {
            source: "npm",
            spec: "@joopo/beta@1.0.0",
          },
        },
      },
    } as JoopoConfig;
    const nextConfig = {
      plugins: {
        installs: {
          alpha: {
            source: "npm",
            spec: "@joopo/alpha@1.1.0",
          },
          beta: {
            source: "npm",
            spec: "@joopo/beta@1.0.0",
          },
        },
      },
    } as JoopoConfig;
    loadConfig.mockReturnValue(cfg);
    setInstalledPluginIndexInstallRecords(cfg.plugins?.installs ?? {});
    updateNpmInstalledPlugins.mockResolvedValue({
      outcomes: [
        { pluginId: "alpha", status: "updated", message: "Updated alpha -> 1.1.0" },
        { pluginId: "beta", status: "error", message: "Failed to update beta: registry timeout" },
      ],
      changed: true,
      config: nextConfig,
    });
    updateNpmInstalledHookPacks.mockResolvedValue({
      outcomes: [],
      changed: false,
      config: nextConfig,
    });

    await expect(runPluginsCommand(["plugins", "update", "--all"])).rejects.toThrow("__exit__:1");

    expect(writePersistedInstalledPluginIndexInstallRecords).toHaveBeenCalledWith(
      nextConfig.plugins?.installs,
    );
    expect(refreshPluginRegistry).toHaveBeenCalledWith({
      config: {},
      installRecords: nextConfig.plugins?.installs,
      reason: "source-changed",
    });
    expect(runtimeLogs).toContain("Failed to update beta: registry timeout");
  });

  it("exits non-zero when a hook pack update reports an error", async () => {
    const cfg = {
      hooks: {
        internal: {
          installs: {
            "demo-hooks": {
              source: "npm",
              spec: "@acme/demo-hooks@1.0.0",
              installPath: "/tmp/hooks/demo-hooks",
              resolvedName: "@acme/demo-hooks",
            },
          },
        },
      },
    } as JoopoConfig;
    loadConfig.mockReturnValue(cfg);
    updateNpmInstalledPlugins.mockResolvedValue({
      config: cfg,
      changed: false,
      outcomes: [],
    });
    updateNpmInstalledHookPacks.mockResolvedValue({
      config: cfg,
      changed: false,
      outcomes: [
        {
          hookId: "demo-hooks",
          status: "error",
          message: 'Failed to update hook pack "demo-hooks": registry timeout',
        },
      ],
    });

    await expect(runPluginsCommand(["plugins", "update", "demo-hooks"])).rejects.toThrow(
      "__exit__:1",
    );

    expect(writeConfigFile).not.toHaveBeenCalled();
    expect(runtimeLogs).toContain('Failed to update hook pack "demo-hooks": registry timeout');
  });
});
