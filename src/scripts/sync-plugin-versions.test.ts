import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncPluginVersions } from "../../scripts/sync-plugin-versions.js";
import { cleanupTempDirs, makeTempDir } from "../../test/helpers/temp-dir.js";

const tempDirs: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("syncPluginVersions", () => {
  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  it("preserves workspace joopo devDependencies and plugin host floors", () => {
    const rootDir = makeTempDir(tempDirs, "joopo-sync-plugin-versions-");

    writeJson(path.join(rootDir, "package.json"), {
      name: "joopo",
      version: "2026.4.1",
    });
    writeJson(path.join(rootDir, "extensions/imessage/package.json"), {
      name: "@joopo/imessage",
      version: "2026.3.30",
      devDependencies: {
        joopo: "workspace:*",
      },
      peerDependencies: {
        joopo: ">=2026.3.30",
      },
      joopo: {
        install: {
          minHostVersion: ">=2026.3.30",
        },
        compat: {
          pluginApi: ">=2026.3.30",
        },
        build: {
          joopoVersion: "2026.3.30",
        },
      },
    });

    const summary = syncPluginVersions(rootDir);
    const updatedPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "extensions/imessage/package.json"), "utf8"),
    ) as {
      version?: string;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      joopo?: {
        install?: {
          minHostVersion?: string;
        };
        compat?: {
          pluginApi?: string;
        };
        build?: {
          joopoVersion?: string;
        };
      };
    };

    expect(summary.updated).toContain("@joopo/imessage");
    expect(updatedPackage.version).toBe("2026.4.1");
    expect(updatedPackage.devDependencies?.joopo).toBe("workspace:*");
    expect(updatedPackage.peerDependencies?.joopo).toBe(">=2026.4.1");
    expect(updatedPackage.joopo?.install?.minHostVersion).toBe(">=2026.3.30");
    expect(updatedPackage.joopo?.compat?.pluginApi).toBe(">=2026.4.1");
    expect(updatedPackage.joopo?.build?.joopoVersion).toBe("2026.4.1");
  });

  it("reports pending version sync without writing in check mode", () => {
    const rootDir = makeTempDir(tempDirs, "joopo-sync-plugin-versions-check-");

    writeJson(path.join(rootDir, "package.json"), {
      name: "joopo",
      version: "2026.4.2",
    });
    writeJson(path.join(rootDir, "extensions/discord/package.json"), {
      name: "@joopo/discord",
      version: "2026.4.1",
      peerDependencies: {
        joopo: ">=2026.4.1",
      },
      joopo: {
        compat: {
          pluginApi: ">=2026.4.1",
        },
      },
    });

    const summary = syncPluginVersions(rootDir, { write: false });
    const unchangedPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "extensions/discord/package.json"), "utf8"),
    ) as {
      version?: string;
      peerDependencies?: Record<string, string>;
      joopo?: {
        compat?: {
          pluginApi?: string;
        };
      };
    };

    expect(summary.updated).toEqual(["@joopo/discord"]);
    expect(unchangedPackage.version).toBe("2026.4.1");
    expect(unchangedPackage.peerDependencies?.joopo).toBe(">=2026.4.1");
    expect(unchangedPackage.joopo?.compat?.pluginApi).toBe(">=2026.4.1");
  });

  it("uses the base release version for beta changelog entries", () => {
    const rootDir = makeTempDir(tempDirs, "joopo-sync-plugin-versions-beta-changelog-");

    writeJson(path.join(rootDir, "package.json"), {
      name: "joopo",
      version: "2026.5.3-beta.1",
    });
    writeJson(path.join(rootDir, "extensions/matrix/package.json"), {
      name: "@joopo/matrix",
      version: "2026.5.3-beta.1",
    });
    fs.mkdirSync(path.join(rootDir, "extensions/matrix"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "extensions/matrix/CHANGELOG.md"),
      "# Changelog\n\n## 2026.5.2\n\n### Changes\n\n- Previous release.\n",
      "utf8",
    );

    const summary = syncPluginVersions(rootDir);
    const changelog = fs.readFileSync(path.join(rootDir, "extensions/matrix/CHANGELOG.md"), "utf8");

    expect(summary.changelogged).toEqual(["@joopo/matrix"]);
    expect(changelog).toContain("## 2026.5.3\n\n### Changes\n- Version alignment");
    expect(changelog).not.toContain("## 2026.5.3-beta.1");

    const checkSummary = syncPluginVersions(rootDir, { write: false });

    expect(checkSummary.changelogged).toEqual([]);
  });
});
