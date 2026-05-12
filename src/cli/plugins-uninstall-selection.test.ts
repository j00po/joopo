import { describe, expect, it } from "vitest";
import type { JoopoConfig } from "../config/config.js";
import { resolvePluginUninstallId } from "./plugins-uninstall-selection.js";

describe("resolvePluginUninstallId", () => {
  it("accepts the recorded JoopoHub spec as an uninstall target", () => {
    const result = resolvePluginUninstallId({
      rawId: "joopohub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "joopohub:linkmind-context",
              joopohubPackage: "linkmind-context",
            },
          },
        },
      } as JoopoConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });

  it("accepts a versionless JoopoHub spec when the install was pinned", () => {
    const result = resolvePluginUninstallId({
      rawId: "joopohub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "joopohub:linkmind-context@1.2.3",
            },
          },
        },
      } as JoopoConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });
});
