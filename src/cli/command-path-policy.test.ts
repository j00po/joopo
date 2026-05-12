import { importFreshModule } from "joopo/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CliCommandCatalogEntry, CliCommandPathPolicy } from "./command-catalog.js";
import {
  resolveCliCatalogCommandPath,
  resolveCliCommandPathPolicy,
  resolveCliNetworkProxyPolicy,
} from "./command-path-policy.js";

const DEFAULT_EXPECTED_POLICY: CliCommandPathPolicy = {
  bypassConfigGuard: false,
  routeConfigGuard: "never",
  loadPlugins: "never",
  pluginRegistry: { scope: "all" },
  hideBanner: false,
  ensureCliPath: true,
  networkProxy: "default",
};

function expectResolvedPolicy(
  commandPath: string[],
  expected: Partial<CliCommandPathPolicy>,
): void {
  expect(resolveCliCommandPathPolicy(commandPath)).toEqual({
    ...DEFAULT_EXPECTED_POLICY,
    ...expected,
  });
}

describe("command-path-policy", () => {
  afterEach(() => {
    vi.doUnmock("./command-catalog.js");
    vi.resetModules();
  });

  it("resolves status policy with shared startup semantics", () => {
    expectResolvedPolicy(["status"], {
      routeConfigGuard: "when-suppressed",
      loadPlugins: "never",
      pluginRegistry: { scope: "channels" },
      ensureCliPath: false,
      networkProxy: "bypass",
    });
  });

  it("applies exact overrides after broader channel plugin rules", () => {
    expectResolvedPolicy(["channels", "send"], {
      loadPlugins: "always",
      pluginRegistry: { scope: "configured-channels" },
    });
    expectResolvedPolicy(["channels", "login"], {
      loadPlugins: "always",
      pluginRegistry: { scope: "configured-channels" },
    });
    expectResolvedPolicy(["channels", "capabilities"], {
      loadPlugins: "always",
      pluginRegistry: { scope: "configured-channels" },
    });
    expectResolvedPolicy(["channels", "add"], {
      loadPlugins: "never",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["channels", "status"], {
      loadPlugins: "never",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: expect.any(Function),
    });
    expectResolvedPolicy(["channels", "list"], {
      loadPlugins: "never",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["channels", "logs"], {
      loadPlugins: "never",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["channels", "remove"], {
      loadPlugins: "always",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["channels", "resolve"], {
      loadPlugins: "always",
      pluginRegistry: { scope: "configured-channels" },
      networkProxy: "bypass",
    });
  });

  it("keeps config-only agent commands on config-only startup", () => {
    expectResolvedPolicy(["agent"], {
      loadPlugins: expect.any(Function),
      pluginRegistry: { scope: "all" },
      networkProxy: expect.any(Function),
    });

    for (const commandPath of [
      ["agents"],
      ["agents", "list"],
      ["agents", "bind"],
      ["agents", "bindings"],
      ["agents", "unbind"],
      ["agents", "set-identity"],
      ["agents", "delete"],
    ]) {
      expectResolvedPolicy(commandPath, {
        loadPlugins: "never",
        networkProxy: "bypass",
      });
    }
  });

  it("resolves mixed startup-only rules", () => {
    expectResolvedPolicy(["configure"], {
      bypassConfigGuard: true,
      loadPlugins: "never",
    });
    expectResolvedPolicy(["config", "validate"], {
      bypassConfigGuard: true,
      loadPlugins: "never",
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["gateway", "status"], {
      routeConfigGuard: "always",
      loadPlugins: "never",
      networkProxy: "bypass",
    });
    expectResolvedPolicy(["plugins", "update"], {
      loadPlugins: "never",
      hideBanner: true,
    });
    for (const commandPath of [
      ["plugins", "install"],
      ["plugins", "list"],
      ["plugins", "inspect"],
      ["plugins", "registry"],
      ["plugins", "doctor"],
    ]) {
      expectResolvedPolicy(commandPath, {
        loadPlugins: "never",
      });
    }
    expectResolvedPolicy(["cron", "list"], {
      bypassConfigGuard: true,
      loadPlugins: "never",
      networkProxy: "bypass",
    });
  });

  it("defaults unknown command paths to network proxy routing", () => {
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "googlemeet", "login"])).toBe(
      "default",
    );
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "tool", "image_generate"])).toBe(
      "bypass",
    );
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "tools", "effective"])).toBe("bypass");
  });

  it("resolves static network proxy bypass policies from the catalog", () => {
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "status"])).toBe("bypass");
    expect(
      resolveCliNetworkProxyPolicy(["node", "joopo", "config", "get", "proxy.enabled"]),
    ).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "proxy", "start"])).toBe("bypass");
  });

  it("resolves mixed network proxy policies from argv-sensitive catalog entries", () => {
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "gateway"])).toBe("default");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "gateway", "run"])).toBe("default");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "gateway", "health"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "node", "run"])).toBe("default");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "node", "status"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "agent", "--local"])).toBe("default");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "agent", "run"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "channels", "status"])).toBe("bypass");
    expect(
      resolveCliNetworkProxyPolicy(["node", "joopo", "channels", "status", "--probe"]),
    ).toBe("default");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "models", "status"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "models", "status", "--probe"])).toBe(
      "default",
    );
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "skills", "info", "browser"])).toBe(
      "bypass",
    );
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "skills", "check"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "skills", "list"])).toBe("bypass");
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "skills", "search", "browser"])).toBe(
      "default",
    );
  });

  it("uses the longest catalog command path for deep network proxy overrides", async () => {
    const catalog: readonly CliCommandCatalogEntry[] = [
      { commandPath: ["nodes"], policy: { networkProxy: "bypass" } },
      {
        commandPath: ["nodes", "camera", "snap"],
        exact: true,
        policy: { networkProxy: "default" },
      },
    ];

    vi.doMock("./command-catalog.js", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./command-catalog.js")>();
      return { ...actual, cliCommandCatalog: catalog };
    });
    const { resolveCliCatalogCommandPath, resolveCliNetworkProxyPolicy } = await importFreshModule<
      typeof import("./command-path-policy.js")
    >(import.meta.url, "./command-path-policy.js?catalog-overrides");

    expect(resolveCliCatalogCommandPath(["node", "joopo", "nodes", "camera", "snap"])).toEqual([
      "nodes",
      "camera",
      "snap",
    ]);
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "nodes", "camera", "snap"])).toBe(
      "default",
    );
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "nodes", "camera", "list"])).toBe(
      "bypass",
    );
  });

  it("stops catalog command path resolution before positional arguments", () => {
    expect(
      resolveCliCatalogCommandPath(["node", "joopo", "config", "get", "proxy.enabled"]),
    ).toEqual(["config", "get"]);
    expect(
      resolveCliCatalogCommandPath(["node", "joopo", "message", "send", "--to", "demo"]),
    ).toEqual(["message"]);
  });

  it("treats bare gateway invocations with options as the gateway runtime", () => {
    const argv = ["node", "joopo", "gateway", "--port", "1234"];

    expect(resolveCliCatalogCommandPath(argv)).toEqual(["gateway"]);
    expect(resolveCliNetworkProxyPolicy(argv)).toBe("default");
  });

  it("does not let gateway run option values spoof bypass subcommands", () => {
    for (const argv of [
      ["node", "joopo", "gateway", "--token", "status"],
      ["node", "joopo", "gateway", "--token=status"],
      ["node", "joopo", "gateway", "--password", "health"],
      ["node", "joopo", "gateway", "--password-file", "status"],
      ["node", "joopo", "gateway", "--ws-log", "compact"],
    ]) {
      expect(resolveCliCatalogCommandPath(argv), argv.join(" ")).toEqual(["gateway"]);
      expect(resolveCliNetworkProxyPolicy(argv), argv.join(" ")).toBe("default");
    }
  });

  it("still resolves real gateway bypass subcommands after their command token", () => {
    expect(resolveCliCatalogCommandPath(["node", "joopo", "gateway", "status"])).toEqual([
      "gateway",
      "status",
    ]);
    expect(
      resolveCliCatalogCommandPath(["node", "joopo", "gateway", "status", "--token", "secret"]),
    ).toEqual(["gateway", "status"]);
    expect(resolveCliNetworkProxyPolicy(["node", "joopo", "gateway", "status"])).toBe("bypass");
  });
});
