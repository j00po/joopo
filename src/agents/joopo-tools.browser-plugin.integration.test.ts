import { afterEach, describe, expect, it, vi } from "vitest";
import type { JoopoConfig } from "../config/config.js";
import { resetConfigRuntimeState, setRuntimeConfigSnapshot } from "../config/config.js";
import { activateSecretsRuntimeSnapshot, clearSecretsRuntimeSnapshot } from "../secrets/runtime.js";
import { resolveJoopoPluginToolsForOptions } from "./joopo-plugin-tools.js";

const hoisted = vi.hoisted(() => ({
  resolvePluginTools: vi.fn(),
}));

vi.mock("../plugins/tools.js", () => ({
  resolvePluginTools: (...args: unknown[]) => hoisted.resolvePluginTools(...args),
}));

describe("createJoopoTools browser plugin integration", () => {
  afterEach(() => {
    hoisted.resolvePluginTools.mockReset();
    clearSecretsRuntimeSnapshot();
    resetConfigRuntimeState();
  });

  it("keeps the browser tool returned by plugin resolution", () => {
    hoisted.resolvePluginTools.mockReturnValue([
      {
        name: "browser",
        description: "browser fixture tool",
        parameters: {
          type: "object",
          properties: {},
        },
        async execute() {
          return {
            content: [{ type: "text", text: "ok" }],
          };
        },
      },
    ]);

    const config = {
      plugins: {
        allow: ["browser"],
      },
    } as JoopoConfig;

    const tools = resolveJoopoPluginToolsForOptions({
      options: { config },
      resolvedConfig: config,
    });

    expect(tools.map((tool) => tool.name)).toContain("browser");
  });

  it("omits the browser tool when plugin resolution returns no browser tool", () => {
    hoisted.resolvePluginTools.mockReturnValue([]);

    const config = {
      plugins: {
        allow: ["browser"],
        entries: {
          browser: {
            enabled: false,
          },
        },
      },
    } as JoopoConfig;

    const tools = resolveJoopoPluginToolsForOptions({
      options: { config },
      resolvedConfig: config,
    });

    expect(tools.map((tool) => tool.name)).not.toContain("browser");
  });

  it("forwards fsPolicy into plugin tool context", async () => {
    let capturedContext: { fsPolicy?: { workspaceOnly: boolean } } | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      const resolvedParams = params as { context?: { fsPolicy?: { workspaceOnly: boolean } } };
      capturedContext = resolvedParams.context;
      return [
        {
          name: "browser",
          description: "browser fixture tool",
          parameters: {
            type: "object",
            properties: {},
          },
          async execute() {
            return {
              content: [{ type: "text", text: "ok" }],
              details: { workspaceOnly: capturedContext?.fsPolicy?.workspaceOnly ?? null },
            };
          },
        },
      ];
    });

    const tools = resolveJoopoPluginToolsForOptions({
      options: {
        config: {
          plugins: {
            allow: ["browser"],
          },
        } as JoopoConfig,
        fsPolicy: { workspaceOnly: true },
      },
      resolvedConfig: {
        plugins: {
          allow: ["browser"],
        },
      } as JoopoConfig,
    });

    const browserTool = tools.find((tool) => tool.name === "browser");
    if (browserTool === undefined) {
      throw new Error("expected browser tool");
    }

    const result = await browserTool.execute("tool-call", {});
    const details = (result.details ?? {}) as { workspaceOnly?: boolean | null };
    expect(details.workspaceOnly).toBe(true);
  });

  it("forwards gateway subagent binding to plugin resolution", () => {
    hoisted.resolvePluginTools.mockReturnValue([]);
    const config = {
      plugins: {
        allow: ["browser"],
      },
    } as JoopoConfig;

    resolveJoopoPluginToolsForOptions({
      options: { config, allowGatewaySubagentBinding: true },
      resolvedConfig: config,
    });

    expect(hoisted.resolvePluginTools).toHaveBeenCalledWith(
      expect.objectContaining({
        allowGatewaySubagentBinding: true,
      }),
    );
  });

  it("forwards plugin tool deny policy to plugin resolution", () => {
    hoisted.resolvePluginTools.mockReturnValue([]);
    const config = {
      plugins: {
        allow: ["browser"],
      },
    } as JoopoConfig;

    resolveJoopoPluginToolsForOptions({
      options: {
        config,
        pluginToolAllowlist: ["*"],
        pluginToolDenylist: ["browser"],
      },
      resolvedConfig: config,
    });

    expect(hoisted.resolvePluginTools).toHaveBeenCalledWith(
      expect.objectContaining({
        toolAllowlist: ["*"],
        toolDenylist: ["browser"],
      }),
    );
  });

  it("does not pass a stale active snapshot as plugin runtime config for a resolved run config", () => {
    const staleSourceConfig = {
      plugins: {
        allow: ["old-plugin"],
      },
    } as JoopoConfig;
    const staleRuntimeConfig = {
      plugins: {
        allow: ["old-plugin"],
      },
    } as JoopoConfig;
    const resolvedRunConfig = {
      plugins: {
        allow: ["browser"],
      },
      tools: {
        experimental: {
          planTool: true,
        },
      },
    } as JoopoConfig;
    let capturedRuntimeConfig: JoopoConfig | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      capturedRuntimeConfig = (params as { context?: { runtimeConfig?: JoopoConfig } }).context
        ?.runtimeConfig;
      return [];
    });
    activateSecretsRuntimeSnapshot({
      sourceConfig: staleSourceConfig,
      config: staleRuntimeConfig,
      authStores: [],
      warnings: [],
      webTools: {
        search: {
          providerSource: "none",
          diagnostics: [],
        },
        fetch: {
          providerSource: "none",
          diagnostics: [],
        },
        diagnostics: [],
      },
    });

    resolveJoopoPluginToolsForOptions({
      options: { config: resolvedRunConfig },
      resolvedConfig: resolvedRunConfig,
    });

    expect(capturedRuntimeConfig).toBe(resolvedRunConfig);
  });

  it("does not let a source-less pinned config snapshot override explicit plugin tool config", () => {
    const pinnedRuntimeConfig = {
      plugins: {
        allow: ["old-plugin"],
      },
    } as JoopoConfig;
    const explicitConfig = {
      plugins: {
        allow: ["browser"],
      },
      tools: {
        experimental: {
          planTool: true,
        },
      },
    } as JoopoConfig;
    let capturedRuntimeConfig: JoopoConfig | undefined;
    let getRuntimeConfig: (() => JoopoConfig | undefined) | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      const context = (
        params as {
          context?: {
            runtimeConfig?: JoopoConfig;
            getRuntimeConfig?: () => JoopoConfig | undefined;
          };
        }
      ).context;
      capturedRuntimeConfig = context?.runtimeConfig;
      getRuntimeConfig = context?.getRuntimeConfig;
      return [];
    });
    setRuntimeConfigSnapshot(pinnedRuntimeConfig);

    resolveJoopoPluginToolsForOptions({
      options: { config: explicitConfig },
      resolvedConfig: explicitConfig,
    });

    expect(capturedRuntimeConfig).toBe(explicitConfig);
    expect(getRuntimeConfig?.()).toBe(explicitConfig);
  });

  it("exposes a live runtime config getter to plugin tool factories", () => {
    const sourceConfig = {
      plugins: {
        allow: ["memory-core"],
      },
    } as JoopoConfig;
    const firstRuntimeConfig = {
      plugins: {
        allow: ["memory-core"],
        entries: { "memory-core": { enabled: true } },
      },
    } as JoopoConfig;
    const nextRuntimeConfig = {
      plugins: {
        allow: ["memory-core"],
        entries: { "memory-core": { enabled: false } },
      },
    } as JoopoConfig;
    let getRuntimeConfig: (() => JoopoConfig | undefined) | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      getRuntimeConfig = (
        params as { context?: { getRuntimeConfig?: () => JoopoConfig | undefined } }
      ).context?.getRuntimeConfig;
      return [];
    });
    setRuntimeConfigSnapshot(firstRuntimeConfig, sourceConfig);

    resolveJoopoPluginToolsForOptions({
      options: { config: sourceConfig },
      resolvedConfig: sourceConfig,
    });

    expect(getRuntimeConfig?.()).toStrictEqual(firstRuntimeConfig);

    setRuntimeConfigSnapshot(nextRuntimeConfig, sourceConfig);

    expect(getRuntimeConfig?.()).toStrictEqual(nextRuntimeConfig);
    expect(getRuntimeConfig?.()?.plugins?.entries?.["memory-core"]?.enabled).toBe(false);
  });
});
