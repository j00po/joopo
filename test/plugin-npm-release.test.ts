import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bundledPluginFile, bundledPluginRoot } from "joopo/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { collectJoopoHubPublishablePluginPackages } from "../scripts/lib/plugin-joopohub-release.ts";
import {
  collectPublishablePluginPackages,
  collectChangedExtensionIdsFromPaths,
  collectPublishablePluginPackageErrors,
  JOOPO_PLUGIN_NPM_REPOSITORY_URL,
  parsePluginReleaseArgs,
  parsePluginReleaseSelection,
  parsePluginReleaseSelectionMode,
  resolveChangedPublishablePluginPackages,
  resolveSelectedPublishablePluginPackages,
  type PublishablePluginPackage,
} from "../scripts/lib/plugin-npm-release.ts";
import { cleanupTempDirs, makeTempRepoRoot, writeJsonFile } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("parsePluginReleaseSelection", () => {
  it("returns an empty list for blank input", () => {
    expect(parsePluginReleaseSelection("")).toEqual([]);
    expect(parsePluginReleaseSelection("   ")).toEqual([]);
    expect(parsePluginReleaseSelection(undefined)).toEqual([]);
  });

  it("dedupes and sorts comma or whitespace separated package names", () => {
    expect(parsePluginReleaseSelection(" @joopo/zalo, @joopo/feishu  @joopo/zalo ")).toEqual([
      "@joopo/feishu",
      "@joopo/zalo",
    ]);
  });
});

describe("parsePluginReleaseSelectionMode", () => {
  it("accepts the supported explicit selection modes", () => {
    expect(parsePluginReleaseSelectionMode("selected")).toBe("selected");
    expect(parsePluginReleaseSelectionMode("all-publishable")).toBe("all-publishable");
  });

  it("rejects unsupported selection modes", () => {
    expect(() => parsePluginReleaseSelectionMode("all")).toThrowError(
      'Unknown selection mode: all. Expected "selected" or "all-publishable".',
    );
  });
});

describe("parsePluginReleaseArgs", () => {
  it("rejects blank explicit plugin selections", () => {
    expect(() => parsePluginReleaseArgs(["--plugins", "   "])).toThrowError(
      "`--plugins` must include at least one package name.",
    );
  });

  it("requires plugin names for selected explicit publish mode", () => {
    expect(() => parsePluginReleaseArgs(["--selection-mode", "selected"])).toThrowError(
      "`--selection-mode selected` requires `--plugins`.",
    );
  });

  it("rejects plugin names when all-publishable mode is selected", () => {
    expect(() =>
      parsePluginReleaseArgs(["--selection-mode", "all-publishable", "--plugins", "@joopo/zalo"]),
    ).toThrowError("`--selection-mode all-publishable` must not be combined with `--plugins`.");
  });

  it("parses explicit all-publishable mode", () => {
    expect(parsePluginReleaseArgs(["--selection-mode", "all-publishable"])).toMatchObject({
      selectionMode: "all-publishable",
      selection: [],
      pluginsFlagProvided: false,
    });
  });
});

describe("collectPublishablePluginPackageErrors", () => {
  it("accepts a valid publishable plugin package candidate", () => {
    expect(
      collectPublishablePluginPackageErrors({
        extensionId: "zalo",
        packageDir: bundledPluginRoot("zalo"),
        packageJson: {
          name: "@joopo/zalo",
          version: "2026.3.15",
          repository: {
            type: "git",
            url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
          },
          joopo: {
            extensions: ["./index.ts"],
            install: {
              npmSpec: "@joopo/zalo",
            },
            release: {
              publishToNpm: true,
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it("flags invalid publishable plugin metadata", () => {
    expect(
      collectPublishablePluginPackageErrors({
        extensionId: "broken",
        packageDir: bundledPluginRoot("broken"),
        packageJson: {
          name: "broken",
          version: "latest",
          private: true,
          joopo: {
            extensions: [""],
            install: {
              npmSpec: "   ",
            },
            release: {
              publishToNpm: true,
            },
          },
        },
      }),
    ).toEqual([
      'package name must start with "@joopo/"; found "broken".',
      "package.json private must not be true.",
      `package.json repository.url must be "${JOOPO_PLUGIN_NPM_REPOSITORY_URL}" so npm provenance can validate GitHub trusted publishing; found "<missing>".`,
      'package.json version must match YYYY.M.D, YYYY.M.D-N, YYYY.M.D-alpha.N, or YYYY.M.D-beta.N; found "latest".',
      "joopo.extensions must contain only non-empty strings.",
      "joopo.install.npmSpec must be a non-empty string for publishable plugins.",
    ]);
  });

  it("requires the GitHub repository URL npm provenance validates for trusted publishing", () => {
    expect(
      collectPublishablePluginPackageErrors({
        extensionId: "twitch",
        packageDir: bundledPluginRoot("twitch"),
        packageJson: {
          name: "@joopo/twitch",
          version: "2026.5.1-beta.1",
          joopo: {
            extensions: ["./index.ts"],
            install: {
              npmSpec: "@joopo/twitch",
            },
            release: {
              publishToNpm: true,
            },
          },
        },
      }),
    ).toEqual([
      `package.json repository.url must be "${JOOPO_PLUGIN_NPM_REPOSITORY_URL}" so npm provenance can validate GitHub trusted publishing; found "<missing>".`,
    ]);
  });

  it("requires npm install metadata for publishable plugins", () => {
    expect(
      collectPublishablePluginPackageErrors({
        extensionId: "voice-call",
        packageDir: bundledPluginRoot("voice-call"),
        packageJson: {
          name: "@joopo/voice-call",
          version: "2026.5.1-beta.1",
          repository: {
            type: "git",
            url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
          },
          joopo: {
            extensions: ["./index.ts"],
            release: {
              publishToNpm: true,
            },
          },
        },
      }),
    ).toEqual(["joopo.install.npmSpec must be a non-empty string for publishable plugins."]);
  });
});

describe("collectPublishablePluginPackages", () => {
  it("keeps publishable plugin dist trees out of the core npm package files list", () => {
    const corePackageRuntimePluginIds = new Set(["discord"]);
    const rootPackage = JSON.parse(readFileSync("package.json", "utf8")) as {
      files?: unknown;
    };
    const packageFiles = new Set(Array.isArray(rootPackage.files) ? rootPackage.files : []);
    const publishablePlugins = [
      ...collectPublishablePluginPackages(),
      ...collectJoopoHubPublishablePluginPackages(),
    ];
    const missingExclusions = Array.from(
      new Set(
        publishablePlugins
          .filter((plugin) => !corePackageRuntimePluginIds.has(plugin.extensionId))
          .map((plugin) => `!dist/extensions/${plugin.extensionId}/**`),
      ),
    ).filter((entry) => !packageFiles.has(entry));

    expect(missingExclusions).toEqual([]);
  });

  it("collects publishable npm plugins from extension package manifests", () => {
    const repoDir = makeTempRepoRoot(tempDirs, "joopo-plugin-npm-release-");
    mkdirSync(join(repoDir, "extensions", "demo-plugin"), { recursive: true });
    writeJsonFile(join(repoDir, "extensions", "demo-plugin", "package.json"), {
      name: "@joopo/demo-plugin",
      version: "2026.4.10",
      repository: {
        type: "git",
        url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
      },
      joopo: {
        extensions: ["./index.ts"],
        install: {
          npmSpec: "@joopo/demo-plugin",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    expect(collectPublishablePluginPackages(repoDir)).toEqual([
      {
        extensionId: "demo-plugin",
        packageDir: "extensions/demo-plugin",
        packageName: "@joopo/demo-plugin",
        version: "2026.4.10",
        channel: "stable",
        publishTag: "latest",
        installNpmSpec: "@joopo/demo-plugin",
      },
    ]);
  });

  it("does not validate unselected publishable plugin manifests", () => {
    const repoDir = makeTempRepoRoot(tempDirs, "joopo-plugin-npm-release-");
    mkdirSync(join(repoDir, "extensions", "demo-plugin"), { recursive: true });
    writeJsonFile(join(repoDir, "extensions", "demo-plugin", "package.json"), {
      name: "@joopo/demo-plugin",
      version: "2026.4.10-beta.1",
      repository: {
        type: "git",
        url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
      },
      joopo: {
        extensions: ["./index.ts"],
        install: {
          npmSpec: "@joopo/demo-plugin",
        },
        release: {
          publishToNpm: true,
        },
      },
    });
    mkdirSync(join(repoDir, "extensions", "private-plugin"), { recursive: true });
    writeJsonFile(join(repoDir, "extensions", "private-plugin", "package.json"), {
      name: "@joopo/private-plugin",
      version: "2026.4.10-beta.1",
      private: true,
      joopo: {
        extensions: ["./index.ts"],
        install: {
          npmSpec: "@joopo/private-plugin",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    expect(
      collectPublishablePluginPackages(repoDir, {
        packageNames: ["@joopo/demo-plugin"],
      }),
    ).toEqual([
      expect.objectContaining({
        extensionId: "demo-plugin",
        packageName: "@joopo/demo-plugin",
        publishTag: "beta",
      }),
    ]);
  });

  it("treats an explicit empty extension filter as no candidates", () => {
    const repoDir = makeTempRepoRoot(tempDirs, "joopo-plugin-npm-release-");
    mkdirSync(join(repoDir, "extensions", "private-plugin"), { recursive: true });
    writeJsonFile(join(repoDir, "extensions", "private-plugin", "package.json"), {
      name: "@joopo/private-plugin",
      version: "2026.4.10-beta.1",
      private: true,
      joopo: {
        extensions: ["./index.ts"],
        release: {
          publishToNpm: true,
        },
      },
    });

    expect(
      collectPublishablePluginPackages(repoDir, {
        extensionIds: [],
      }),
    ).toEqual([]);
  });

  it("publishes alpha plugin packages to the alpha dist-tag", () => {
    const repoDir = makeTempRepoRoot(tempDirs, "joopo-plugin-npm-release-");
    mkdirSync(join(repoDir, "extensions", "demo-plugin"), { recursive: true });
    writeJsonFile(join(repoDir, "extensions", "demo-plugin", "package.json"), {
      name: "@joopo/demo-plugin",
      version: "2026.4.10-alpha.1",
      repository: {
        type: "git",
        url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
      },
      joopo: {
        extensions: ["./index.ts"],
        install: {
          npmSpec: "@joopo/demo-plugin",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    expect(collectPublishablePluginPackages(repoDir)).toEqual([
      expect.objectContaining({
        channel: "alpha",
        packageName: "@joopo/demo-plugin",
        publishTag: "alpha",
        version: "2026.4.10-alpha.1",
      }),
    ]);
  });
});

describe("resolveSelectedPublishablePluginPackages", () => {
  const publishablePlugins: PublishablePluginPackage[] = [
    {
      extensionId: "feishu",
      packageDir: bundledPluginRoot("feishu"),
      packageName: "@joopo/feishu",
      version: "2026.3.15",
      channel: "stable",
      publishTag: "latest",
    },
    {
      extensionId: "zalo",
      packageDir: bundledPluginRoot("zalo"),
      packageName: "@joopo/zalo",
      version: "2026.3.15-beta.1",
      channel: "beta",
      publishTag: "beta",
    },
  ];

  it("returns all publishable plugins when no selection is provided", () => {
    expect(
      resolveSelectedPublishablePluginPackages({
        plugins: publishablePlugins,
        selection: [],
      }),
    ).toEqual(publishablePlugins);
  });

  it("filters by selected publishable package names", () => {
    expect(
      resolveSelectedPublishablePluginPackages({
        plugins: publishablePlugins,
        selection: ["@joopo/zalo"],
      }),
    ).toEqual([publishablePlugins[1]]);
  });

  it("throws when the selection contains an unknown package name", () => {
    expect(() =>
      resolveSelectedPublishablePluginPackages({
        plugins: publishablePlugins,
        selection: ["@joopo/missing"],
      }),
    ).toThrowError("Unknown or non-publishable plugin package selection: @joopo/missing.");
  });
});

describe("collectChangedExtensionIdsFromPaths", () => {
  it("extracts unique extension ids from changed extension paths", () => {
    expect(
      collectChangedExtensionIdsFromPaths([
        bundledPluginFile("zalo", "index.ts"),
        bundledPluginFile("zalo", "package.json"),
        bundledPluginFile("feishu", "src/client.ts"),
        "docs/reference/RELEASING.md",
      ]),
    ).toEqual(["feishu", "zalo"]);
  });
});

describe("resolveChangedPublishablePluginPackages", () => {
  const publishablePlugins: PublishablePluginPackage[] = [
    {
      extensionId: "feishu",
      packageDir: bundledPluginRoot("feishu"),
      packageName: "@joopo/feishu",
      version: "2026.3.15",
      channel: "stable",
      publishTag: "latest",
    },
    {
      extensionId: "zalo",
      packageDir: bundledPluginRoot("zalo"),
      packageName: "@joopo/zalo",
      version: "2026.3.15-beta.1",
      channel: "beta",
      publishTag: "beta",
    },
  ];

  it("returns only changed publishable plugins", () => {
    expect(
      resolveChangedPublishablePluginPackages({
        plugins: publishablePlugins,
        changedExtensionIds: ["zalo"],
      }),
    ).toEqual([publishablePlugins[1]]);
  });

  it("returns an empty list when no publishable plugins changed", () => {
    expect(
      resolveChangedPublishablePluginPackages({
        plugins: publishablePlugins,
        changedExtensionIds: [],
      }),
    ).toEqual([]);
  });
});
