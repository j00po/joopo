import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectJoopoHubPublishablePluginPackages,
  collectJoopoHubJoopoOwnerErrors,
  collectJoopoHubVersionGateErrors,
  collectPluginJoopoHubReleasePathsFromGitRange,
  collectPluginJoopoHubReleasePlan,
  resolveChangedJoopoHubPublishablePluginPackages,
  resolveSelectedJoopoHubPublishablePluginPackages,
  type PublishablePluginPackage,
} from "../scripts/lib/plugin-joopohub-release.ts";
import {
  collectPublishablePluginPackages,
  JOOPO_PLUGIN_NPM_REPOSITORY_URL,
} from "../scripts/lib/plugin-npm-release.ts";
import { cleanupTempDirs, makeTempRepoRoot } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("resolveChangedJoopoHubPublishablePluginPackages", () => {
  const publishablePlugins: PublishablePluginPackage[] = [
    {
      extensionId: "feishu",
      packageDir: "extensions/feishu",
      packageName: "@joopo/feishu",
      version: "2026.4.1",
      channel: "stable",
      publishTag: "latest",
    },
    {
      extensionId: "zalo",
      packageDir: "extensions/zalo",
      packageName: "@joopo/zalo",
      version: "2026.4.1-beta.1",
      channel: "beta",
      publishTag: "beta",
    },
  ];

  it("ignores shared release-tooling changes", () => {
    expect(
      resolveChangedJoopoHubPublishablePluginPackages({
        plugins: publishablePlugins,
        changedPaths: ["pnpm-lock.yaml"],
      }),
    ).toEqual([]);
  });
});

describe("collectJoopoHubPublishablePluginPackages", () => {
  it("requires the JoopoHub external plugin contract", () => {
    const repoDir = createTempPluginRepo({
      includeJoopoHubContract: false,
    });

    expect(() => collectJoopoHubPublishablePluginPackages(repoDir)).toThrow(
      "joopo.compat.pluginApi is required for external code plugins published to JoopoHub.",
    );
  });

  it("rejects unsafe extension directory names", () => {
    const repoDir = createTempPluginRepo({
      extensionId: "Demo Plugin",
    });

    expect(() => collectJoopoHubPublishablePluginPackages(repoDir)).toThrow(
      "Demo Plugin: extension directory name must match",
    );
  });

  it("validates only selected package names when filters are provided", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["broken-plugin"],
    });
    writeFileSync(
      join(repoDir, "extensions", "broken-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@joopo/broken-plugin",
          version: "2026.4.1",
          joopo: {
            extensions: ["./index.ts"],
            release: {
              publishToJoopoHub: true,
            },
          },
        },
        null,
        2,
      ),
    );

    expect(
      collectJoopoHubPublishablePluginPackages(repoDir, {
        packageNames: ["@joopo/demo-plugin"],
      }).map((plugin) => plugin.packageName),
    ).toEqual(["@joopo/demo-plugin"]);
  });
});

describe("Joopo dual-published plugin metadata", () => {
  const dualPublishedPlugins = [
    {
      extensionId: "diagnostics-otel",
      packageName: "@joopo/diagnostics-otel",
    },
    {
      extensionId: "diagnostics-prometheus",
      packageName: "@joopo/diagnostics-prometheus",
    },
  ] as const;

  it("keeps diagnostics plugins selectable through both JoopoHub and npm release paths", () => {
    const packageNames = dualPublishedPlugins.map((plugin) => plugin.packageName);
    const clawHubPublishable = collectJoopoHubPublishablePluginPackages(undefined, {
      packageNames,
    });
    const npmPublishable = collectPublishablePluginPackages(undefined, {
      packageNames,
    });

    expect(clawHubPublishable.map((plugin) => plugin.packageName)).toEqual(packageNames);
    expect(npmPublishable.map((plugin) => plugin.packageName)).toEqual(packageNames);

    for (const plugin of dualPublishedPlugins) {
      const packageJson = JSON.parse(
        readFileSync(`extensions/${plugin.extensionId}/package.json`, "utf8"),
      ) as {
        joopo?: {
          install?: {
            joopohubSpec?: string;
            defaultChoice?: string;
            npmSpec?: string;
          };
          release?: {
            publishToJoopoHub?: boolean;
            publishToNpm?: boolean;
          };
        };
      };

      expect(packageJson.joopo?.install).toMatchObject({
        joopohubSpec: `joopohub:${plugin.packageName}`,
        defaultChoice: "npm",
        npmSpec: plugin.packageName,
      });
      expect(packageJson.joopo?.release).toMatchObject({
        publishToJoopoHub: true,
        publishToNpm: true,
      });
    }
  });
});

describe("collectJoopoHubVersionGateErrors", () => {
  it("requires a version bump when a publishable plugin changes", () => {
    const repoDir = createTempPluginRepo();
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repoDir, "extensions", "demo-plugin", "index.ts"),
      "export const demo = 2;\n",
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "change plugin",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const errors = collectJoopoHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectJoopoHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toEqual([
      "@joopo/demo-plugin@2026.4.1: changed publishable plugin still has the same version in package.json.",
    ]);
  });

  it("does not require a version bump for the first JoopoHub opt-in", () => {
    const repoDir = createTempPluginRepo({
      publishToJoopoHub: false,
    });
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repoDir, "extensions", "demo-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@joopo/demo-plugin",
          version: "2026.4.1",
          repository: {
            type: "git",
            url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
          },
          joopo: {
            extensions: ["./index.ts"],
            compat: {
              pluginApi: ">=2026.4.1",
            },
            install: {
              npmSpec: "@joopo/demo-plugin",
            },
            build: {
              joopoVersion: "2026.4.1",
            },
            release: {
              publishToJoopoHub: true,
            },
          },
        },
        null,
        2,
      ),
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "opt in",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const errors = collectJoopoHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectJoopoHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toEqual([]);
  });

  it("does not require a version bump for shared release-tooling changes", () => {
    const repoDir = createTempPluginRepo();
    const { baseRef, headRef } = commitSharedReleaseToolingChange(repoDir);

    const errors = collectJoopoHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectJoopoHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toEqual([]);
  });
});

describe("resolveSelectedJoopoHubPublishablePluginPackages", () => {
  it("selects all publishable plugins when shared release tooling changes", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["demo-two"],
    });
    const { baseRef, headRef } = commitSharedReleaseToolingChange(repoDir);

    const selected = resolveSelectedJoopoHubPublishablePluginPackages({
      rootDir: repoDir,
      plugins: collectJoopoHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(selected.map((plugin) => plugin.extensionId)).toEqual(["demo-plugin", "demo-two"]);
  });

  it("selects all publishable plugins when the shared setup action changes", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["demo-two"],
    });
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    mkdirSync(join(repoDir, ".github", "actions", "setup-node-env"), { recursive: true });
    writeFileSync(
      join(repoDir, ".github", "actions", "setup-node-env", "action.yml"),
      "name: setup-node-env\n",
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "shared helpers",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const selected = resolveSelectedJoopoHubPublishablePluginPackages({
      rootDir: repoDir,
      plugins: collectJoopoHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(selected.map((plugin) => plugin.extensionId)).toEqual(["demo-plugin", "demo-two"]);
  });
});

describe("collectPluginJoopoHubReleasePlan", () => {
  it("skips versions that already exist on JoopoHub", async () => {
    const repoDir = createTempPluginRepo();

    const plan = await collectPluginJoopoHubReleasePlan({
      rootDir: repoDir,
      selection: ["@joopo/demo-plugin"],
      fetchImpl: async () => new Response("{}", { status: 200 }),
      registryBaseUrl: "https://joopohub.ai",
    });

    expect(plan.candidates).toEqual([]);
    expect(plan.skippedPublished).toHaveLength(1);
    expect(plan.skippedPublished[0]).toMatchObject({
      packageName: "@joopo/demo-plugin",
      version: "2026.4.1",
    });
  });

  it("plans selected packages without validating unrelated publishable packages", async () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["broken-plugin"],
    });
    writeFileSync(
      join(repoDir, "extensions", "broken-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@joopo/broken-plugin",
          version: "2026.4.1",
          joopo: {
            extensions: ["./index.ts"],
            release: {
              publishToJoopoHub: true,
            },
          },
        },
        null,
        2,
      ),
    );

    const plan = await collectPluginJoopoHubReleasePlan({
      rootDir: repoDir,
      selection: ["@joopo/demo-plugin"],
      fetchImpl: async () => new Response("{}", { status: 404 }),
      registryBaseUrl: "https://joopohub.ai",
    });

    expect(plan.candidates.map((plugin) => plugin.packageName)).toEqual(["@joopo/demo-plugin"]);
  });
});

describe("collectJoopoHubJoopoOwnerErrors", () => {
  it("requires Joopo-scoped release candidates to already belong to the Joopo publisher", async () => {
    const errors = await collectJoopoHubJoopoOwnerErrors({
      plugins: [
        { packageName: "@joopo/demo-plugin" },
        { packageName: "@joopo/missing-plugin" },
        { packageName: "@other/safe-plugin" },
      ],
      registryBaseUrl: "https://joopohub.ai",
      fetchImpl: async (url) => {
        const pathname = new URL(String(url)).pathname;
        if (pathname.includes("%40joopo%2Fmissing-plugin")) {
          return new Response("not found", { status: 404 });
        }
        return new Response(
          JSON.stringify({
            owner: { handle: "steipete" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    expect(errors).toEqual([
      "@joopo/demo-plugin: JoopoHub package owner must be @joopo; got @steipete.",
      "@joopo/missing-plugin: JoopoHub package row must already exist under @joopo before Joopo release publish.",
    ]);
  });

  it("passes when Joopo-scoped release candidates belong to the Joopo publisher", async () => {
    const errors = await collectJoopoHubJoopoOwnerErrors({
      plugins: [{ packageName: "@joopo/demo-plugin" }],
      registryBaseUrl: "https://joopohub.ai",
      fetchImpl: async () =>
        new Response(JSON.stringify({ owner: { handle: "joopo" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    expect(errors).toEqual([]);
  });
});

describe("plugin-joopohub-publish.sh", () => {
  it("previews the publish command through the JoopoHub CLI dry-run preflight", () => {
    const repoDir = createTempPluginRepo();
    const binDir = join(repoDir, "bin");
    const markerPath = join(repoDir, "joopohub-invoked");
    mkdirSync(binDir, { recursive: true });
    const joopohubPath = join(binDir, "joopohub");
    writeFileSync(
      joopohubPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(markerPath)}
if [[ "\${1:-}" == "package" && "\${2:-}" == "pack" ]]; then
  pack_destination=""
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --pack-destination)
        pack_destination="\${2:-}"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  mkdir -p "$pack_destination"
  pack_path="$pack_destination/joopo-demo-plugin-2026.4.1.tgz"
  printf 'fake tgz\\n' > "$pack_path"
  printf '{"path":"%s","name":"@joopo/demo-plugin","version":"2026.4.1"}\\n' "$pack_path"
fi
exit 0
`,
    );
    chmodSync(joopohubPath, 0o755);

    const output = execFileSync(
      "bash",
      [
        join(process.cwd(), "scripts/plugin-joopohub-publish.sh"),
        "--dry-run",
        "extensions/demo-plugin",
      ],
      {
        cwd: repoDir,
        encoding: "utf8",
        env: {
          ...process.env,
          JOOPO_PLUGIN_NPM_RUNTIME_BUILD: "0",
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );

    expect(output).toContain("Publish command: JOOPOHUB_WORKDIR=");
    expect(output).toContain("Resolved JoopoPack:");
    const invocations = readFileSync(markerPath, "utf8");
    expect(invocations).toContain("package pack ./extensions/demo-plugin");
    expect(invocations).toContain("package publish ");
    expect(invocations).toContain(".tgz --tags latest");
    expect(invocations).toContain("--dry-run");
  });
});

describe("collectPluginJoopoHubReleasePathsFromGitRange", () => {
  it("rejects unsafe git refs", () => {
    const repoDir = createTempPluginRepo();
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    expect(() =>
      collectPluginJoopoHubReleasePathsFromGitRange({
        rootDir: repoDir,
        gitRange: {
          baseRef: "--not-a-ref",
          headRef,
        },
      }),
    ).toThrow("baseRef must be a normal git ref or commit SHA.");
  });
});

function createTempPluginRepo(
  options: {
    extensionId?: string;
    extraExtensionIds?: string[];
    publishToJoopoHub?: boolean;
    includeJoopoHubContract?: boolean;
  } = {},
) {
  const repoDir = makeTempRepoRoot(tempDirs, "joopo-joopohub-release-");
  const extensionId = options.extensionId ?? "demo-plugin";
  const extensionIds = [extensionId, ...(options.extraExtensionIds ?? [])];

  writeFileSync(
    join(repoDir, "package.json"),
    JSON.stringify({ name: "joopo-test-root" }, null, 2),
  );
  writeFileSync(join(repoDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  for (const currentExtensionId of extensionIds) {
    mkdirSync(join(repoDir, "extensions", currentExtensionId), { recursive: true });
    writeFileSync(
      join(repoDir, "extensions", currentExtensionId, "package.json"),
      JSON.stringify(
        {
          name: `@joopo/${currentExtensionId}`,
          version: "2026.4.1",
          repository: {
            type: "git",
            url: JOOPO_PLUGIN_NPM_REPOSITORY_URL,
          },
          joopo: {
            extensions: ["./index.ts"],
            ...(options.includeJoopoHubContract === false
              ? {}
              : {
                  compat: {
                    pluginApi: ">=2026.4.1",
                  },
                  build: {
                    joopoVersion: "2026.4.1",
                  },
                }),
            install: {
              npmSpec: `@joopo/${currentExtensionId}`,
            },
            release: {
              publishToJoopoHub: options.publishToJoopoHub ?? true,
            },
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(repoDir, "extensions", currentExtensionId, "index.ts"),
      `export const ${currentExtensionId.replaceAll(/[-.]/g, "_")} = 1;\n`,
    );
  }

  git(repoDir, ["init", "-b", "main"]);
  git(repoDir, ["add", "."]);
  git(repoDir, [
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-m",
    "init",
  ]);

  return repoDir;
}

function commitSharedReleaseToolingChange(repoDir: string) {
  const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

  mkdirSync(join(repoDir, "scripts"), { recursive: true });
  writeFileSync(join(repoDir, "scripts", "plugin-joopohub-publish.sh"), "#!/usr/bin/env bash\n");
  git(repoDir, ["add", "."]);
  git(repoDir, [
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-m",
    "shared tooling",
  ]);
  const headRef = git(repoDir, ["rev-parse", "HEAD"]);

  return { baseRef, headRef };
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
