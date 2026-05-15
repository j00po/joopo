import { beforeEach, describe, expect, it } from "vitest";
import { createPluginRecord } from "../plugins/status.test-helpers.js";
import {
  buildPluginDiagnosticsReport,
  buildPluginInspectReport,
  buildPluginRegistrySnapshotReport,
  buildPluginSnapshotReport,
  inspectPluginRegistry,
  resetPluginsCliTestState,
  refreshPluginRegistry,
  runPluginsCommand,
  runtimeErrors,
  runtimeLogs,
  setInstalledPluginIndexInstallRecords,
} from "./plugins-cli-test-helpers.js";

describe("plugins cli list", () => {
  beforeEach(() => {
    resetPluginsCliTestState();
  });

  it("includes imported state in JSON output", async () => {
    buildPluginRegistrySnapshotReport.mockReturnValue({
      workspaceDir: "/workspace",
      registrySource: "persisted",
      registryDiagnostics: [],
      plugins: [
        createPluginRecord({
          id: "demo",
          imported: true,
          activated: true,
          explicitlyEnabled: true,
        }),
      ],
      diagnostics: [],
    });

    await runPluginsCommand(["plugins", "list", "--json"]);

    expect(buildPluginRegistrySnapshotReport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {},
        logger: expect.objectContaining({
          info: expect.any(Function),
          warn: expect.any(Function),
          error: expect.any(Function),
        }),
      }),
    );

    expect(JSON.parse(runtimeLogs[0] ?? "null")).toEqual({
      workspaceDir: "/workspace",
      registry: {
        source: "persisted",
        diagnostics: [],
      },
      plugins: [
        expect.objectContaining({
          id: "demo",
          imported: true,
          activated: true,
          explicitlyEnabled: true,
        }),
      ],
      diagnostics: [],
    });
  });

  it("keeps doctor on a module-loading snapshot", async () => {
    buildPluginDiagnosticsReport.mockReturnValue({
      plugins: [],
      diagnostics: [],
    });

    await runPluginsCommand(["plugins", "doctor"]);

    expect(buildPluginDiagnosticsReport).toHaveBeenCalledWith({ effectiveOnly: true });
    expect(runtimeLogs).toContain("No plugin issues detected.");
  });

  it("reports config-selected plugin source shadowing in doctor output", async () => {
    buildPluginDiagnosticsReport.mockReturnValue({
      plugins: [
        createPluginRecord({
          id: "discord",
          origin: "config",
          source: "/tmp/joopo-upstream/extensions/discord/index.ts",
          status: "error",
          error: "Cannot find module 'chalk'",
        }),
      ],
      diagnostics: [
        {
          level: "warn",
          pluginId: "discord",
          source: "/tmp/joopo/npm/node_modules/@joopo/discord/index.ts",
          message:
            "duplicate plugin id resolved by explicit config-selected plugin; global plugin will be overridden by config plugin (/tmp/joopo-upstream/extensions/discord/index.ts)",
        },
      ],
    });

    await runPluginsCommand(["plugins", "doctor"]);

    const output = runtimeLogs.join("\n");
    expect(output).toContain("Plugin source shadowing:");
    expect(output).toContain(
      "discord: duplicate plugin id resolved by explicit config-selected plugin",
    );
    expect(output).toContain("active: /tmp/joopo-upstream/extensions/discord/index.ts");
    expect(output).toContain("shadowed: /tmp/joopo/npm/node_modules/@joopo/discord/index.ts");
    expect(output).toContain("joopo plugins registry --refresh");
  });

  it("does not report healthy config-selected plugin source shadowing as doctor issue", async () => {
    buildPluginDiagnosticsReport.mockReturnValue({
      plugins: [
        createPluginRecord({
          id: "discord",
          origin: "config",
          source: "/tmp/joopo-upstream/extensions/discord/index.ts",
          status: "loaded",
        }),
      ],
      diagnostics: [
        {
          level: "warn",
          pluginId: "discord",
          source: "/tmp/joopo/npm/node_modules/@joopo/discord/index.ts",
          message:
            "duplicate plugin id resolved by explicit config-selected plugin; global plugin will be overridden by config plugin (/tmp/joopo-upstream/extensions/discord/index.ts)",
        },
      ],
    });

    await runPluginsCommand(["plugins", "doctor"]);

    expect(runtimeLogs).toContain("No plugin issues detected.");
  });

  it("reports persisted plugin registry state without refreshing", async () => {
    inspectPluginRegistry.mockResolvedValue({
      state: "stale",
      refreshReasons: ["stale-manifest"],
      persisted: {
        plugins: [{ pluginId: "demo", enabled: true }],
      },
      current: {
        plugins: [
          { pluginId: "demo", enabled: true },
          { pluginId: "next", enabled: false },
        ],
      },
    });

    await runPluginsCommand(["plugins", "registry"]);

    expect(inspectPluginRegistry).toHaveBeenCalledWith({ config: {} });
    expect(refreshPluginRegistry).not.toHaveBeenCalled();
    expect(runtimeLogs.join("\n")).toContain("State:");
    expect(runtimeLogs.join("\n")).toContain("stale");
    expect(runtimeLogs.join("\n")).toContain("Refresh reasons:");
    expect(runtimeLogs.join("\n")).toContain("joopo plugins registry --refresh");
  });

  it("refreshes the persisted plugin registry on request", async () => {
    refreshPluginRegistry.mockResolvedValue({
      plugins: [
        { pluginId: "demo", enabled: true },
        { pluginId: "off", enabled: false },
      ],
    });

    await runPluginsCommand(["plugins", "registry", "--refresh"]);

    expect(refreshPluginRegistry).toHaveBeenCalledWith({
      config: {},
      reason: "manual",
    });
    expect(inspectPluginRegistry).not.toHaveBeenCalled();
    expect(runtimeLogs.join("\n")).toContain("Plugin registry refreshed: 1/2 enabled");
  });

  it("keeps inspect on the static snapshot by default", async () => {
    setInstalledPluginIndexInstallRecords({
      "joopo-mem0": {
        source: "joopohub",
        spec: "joopohub:joopo-mem0",
        installPath: "/plugins/joopo-mem0",
        version: "2026.5.1",
        joopohubPackage: "joopo-mem0",
        joopohubChannel: "official",
        artifactKind: "npm-pack",
        artifactFormat: "tgz",
        npmIntegrity: "sha512-joopopack",
        npmShasum: "1".repeat(40),
        npmTarballName: "joopo-mem0-2026.5.1.tgz",
        joopopackSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        joopopackSpecVersion: 1,
        joopopackManifestSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        joopopackSize: 4096,
      },
    });
    buildPluginSnapshotReport.mockReturnValue({
      plugins: [createPluginRecord({ id: "joopo-mem0", name: "Mem0" })],
      diagnostics: [],
    });
    buildPluginInspectReport.mockReturnValue({
      workspaceDir: "/workspace",
      plugin: createPluginRecord({ id: "joopo-mem0", name: "Mem0" }),
      shape: "hook-only",
      capabilityMode: "plain",
      capabilityCount: 1,
      capabilities: [],
      typedHooks: [{ name: "agent_end" }],
      customHooks: [],
      tools: [],
      commands: [],
      cliCommands: [],
      services: [],
      gatewayDiscoveryServices: [],
      gatewayMethods: [],
      mcpServers: [],
      lspServers: [],
      httpRouteCount: 0,
      bundleCapabilities: [],
      diagnostics: [],
      policy: {
        allowConversationAccess: true,
        allowedModels: [],
        hasAllowedModelsConfig: false,
      },
      usesLegacyBeforeAgentStart: false,
      compatibility: [],
    });

    await runPluginsCommand(["plugins", "inspect", "joopo-mem0"]);

    expect(buildPluginDiagnosticsReport).not.toHaveBeenCalled();
    expect(runtimeLogs.join("\n")).toContain("Policy");
    expect(runtimeLogs.join("\n")).toContain("allowConversationAccess: true");
    expect(runtimeLogs.join("\n")).toContain("JoopoHub package: joopo-mem0");
    expect(runtimeLogs.join("\n")).toContain("Artifact kind: npm-pack");
    expect(runtimeLogs.join("\n")).toContain("Npm integrity: sha512-joopopack");
    expect(runtimeLogs.join("\n")).toContain(
      "JoopoPack sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(runtimeLogs.join("\n")).toContain("JoopoPack spec: 1");
    expect(runtimeLogs.join("\n")).toContain("JoopoPack size: 4096 bytes");
  });

  it("runtime-inspects without repairing deps", async () => {
    buildPluginSnapshotReport.mockReturnValue({
      plugins: [createPluginRecord({ id: "joopo-mem0", name: "Mem0" })],
      diagnostics: [],
    });
    buildPluginInspectReport.mockReturnValue({
      workspaceDir: "/workspace",
      plugin: createPluginRecord({ id: "joopo-mem0", name: "Mem0" }),
      shape: "hook-only",
      capabilityMode: "plain",
      capabilityCount: 1,
      capabilities: [],
      typedHooks: [],
      customHooks: [],
      tools: [],
      commands: [],
      cliCommands: [],
      services: [],
      gatewayDiscoveryServices: [],
      gatewayMethods: [],
      mcpServers: [],
      lspServers: [],
      httpRouteCount: 0,
      bundleCapabilities: [],
      diagnostics: [],
      policy: {
        allowedModels: [],
        hasAllowedModelsConfig: false,
      },
      usesLegacyBeforeAgentStart: false,
      compatibility: [],
    });

    await runPluginsCommand(["plugins", "inspect", "joopo-mem0", "--runtime"]);

    expect(buildPluginDiagnosticsReport).toHaveBeenCalledWith({
      config: {},
      onlyPluginIds: ["joopo-mem0"],
    });
  });

  it("does not runtime-load plugins when inspect target is missing", async () => {
    buildPluginSnapshotReport.mockReturnValue({
      plugins: [],
      diagnostics: [],
    });

    await expect(runPluginsCommand(["plugins", "inspect", "missing-plugin"])).rejects.toThrow(
      "__exit__:1",
    );

    expect(buildPluginSnapshotReport).toHaveBeenCalledWith({ config: {} });
    expect(buildPluginDiagnosticsReport).not.toHaveBeenCalled();
    expect(runtimeErrors.at(-1)).toContain("Plugin not found: missing-plugin");
  });
});
