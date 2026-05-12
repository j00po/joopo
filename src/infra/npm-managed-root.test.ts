import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  repairManagedNpmRootJoopoPeer,
  removeManagedNpmRootDependency,
  readManagedNpmRootInstalledDependency,
  readJoopoManagedNpmRootOverrides,
  resolveManagedNpmRootDependencySpec,
  upsertManagedNpmRootDependency,
} from "./npm-managed-root.js";

const tempDirs: string[] = [];

const successfulSpawn = {
  code: 0,
  stdout: "",
  stderr: "",
  signal: null,
  killed: false,
  termination: "exit" as const,
};

async function makeTempRoot(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-npm-managed-root-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("managed npm root", () => {
  it("keeps existing plugin dependencies when adding another managed plugin", async () => {
    const npmRoot = await makeTempRoot();
    await fs.writeFile(
      path.join(npmRoot, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            "@joopo/discord": "2026.5.2",
          },
          devDependencies: {
            fixture: "1.0.0",
          },
        },
        null,
        2,
      )}\n`,
    );

    await upsertManagedNpmRootDependency({
      npmRoot,
      packageName: "@joopo/feishu",
      dependencySpec: "2026.5.2",
    });

    await expect(
      fs.readFile(path.join(npmRoot, "package.json"), "utf8").then((raw) => JSON.parse(raw)),
    ).resolves.toEqual({
      private: true,
      dependencies: {
        "@joopo/discord": "2026.5.2",
        "@joopo/feishu": "2026.5.2",
      },
      devDependencies: {
        fixture: "1.0.0",
      },
    });
  });

  it("syncs Joopo-owned overrides without dropping unrelated local overrides", async () => {
    const npmRoot = await makeTempRoot();
    await fs.writeFile(
      path.join(npmRoot, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            "@joopo/discord": "2026.5.2",
          },
          overrides: {
            axios: "1.13.6",
            "left-pad": "1.3.0",
            qs: "6.14.0",
          },
          joopo: {
            managedOverrides: ["axios", "qs"],
          },
        },
        null,
        2,
      )}\n`,
    );

    await upsertManagedNpmRootDependency({
      npmRoot,
      packageName: "@joopo/feishu",
      dependencySpec: "2026.5.4",
      managedOverrides: {
        axios: "1.16.0",
        "node-domexception": "npm:@nolyfill/domexception@1.0.28",
      },
    });

    await expect(
      fs.readFile(path.join(npmRoot, "package.json"), "utf8").then((raw) => JSON.parse(raw)),
    ).resolves.toEqual({
      private: true,
      dependencies: {
        "@joopo/discord": "2026.5.2",
        "@joopo/feishu": "2026.5.4",
      },
      overrides: {
        "left-pad": "1.3.0",
        axios: "1.16.0",
        "node-domexception": "npm:@nolyfill/domexception@1.0.28",
      },
      joopo: {
        managedOverrides: ["axios", "node-domexception"],
      },
    });
  });

  it("reads package-level npm overrides for managed plugin installs", async () => {
    await expect(readJoopoManagedNpmRootOverrides()).resolves.toMatchObject({
      axios: "1.16.0",
    });
  });

  it("resolves package-level npm overrides from packaged dist chunks", async () => {
    const packageRoot = await makeTempRoot();
    await fs.mkdir(path.join(packageRoot, "dist"), { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "joopo",
          overrides: {
            axios: "1.16.0",
          },
        },
        null,
        2,
      )}\n`,
    );

    await expect(
      readJoopoManagedNpmRootOverrides({
        moduleUrl: pathToFileURL(path.join(packageRoot, "dist", "install-AbCdEf.js")).toString(),
        cwd: path.join(packageRoot, "dist"),
      }),
    ).resolves.toEqual({
      axios: "1.16.0",
    });
  });

  it("resolves npm override dependency references from the host package manifest", async () => {
    const packageRoot = await makeTempRoot();
    await fs.writeFile(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "joopo",
          dependencies: {
            "@aws-sdk/client-bedrock-runtime": "3.1024.0",
          },
          optionalDependencies: {
            "optional-runtime": "2.0.0",
          },
          overrides: {
            "@aws-sdk/client-bedrock-runtime": "$@aws-sdk/client-bedrock-runtime",
            nested: {
              "optional-runtime": "$optional-runtime",
            },
            axios: "1.16.0",
          },
        },
        null,
        2,
      )}\n`,
    );

    await expect(readJoopoManagedNpmRootOverrides({ packageRoot })).resolves.toEqual({
      "@aws-sdk/client-bedrock-runtime": "3.1024.0",
      nested: {
        "optional-runtime": "2.0.0",
      },
      axios: "1.16.0",
    });
  });

  it("does not overwrite a present malformed package manifest", async () => {
    const npmRoot = await makeTempRoot();
    const manifestPath = path.join(npmRoot, "package.json");
    await fs.writeFile(manifestPath, "{not-json", "utf8");

    await expect(
      upsertManagedNpmRootDependency({
        npmRoot,
        packageName: "@joopo/feishu",
        dependencySpec: "2026.5.2",
      }),
    ).rejects.toThrow();

    await expect(fs.readFile(manifestPath, "utf8")).resolves.toBe("{not-json");
  });

  it("pins managed dependencies to the resolved version", () => {
    expect(
      resolveManagedNpmRootDependencySpec({
        parsedSpec: {
          name: "@joopo/discord",
          raw: "@joopo/discord@stable",
          selector: "stable",
          selectorKind: "tag",
          selectorIsPrerelease: false,
        },
        resolution: {
          name: "@joopo/discord",
          version: "2026.5.2",
          resolvedSpec: "@joopo/discord@2026.5.2",
          resolvedAt: "2026-05-03T00:00:00.000Z",
        },
      }),
    ).toBe("2026.5.2");

    expect(
      resolveManagedNpmRootDependencySpec({
        parsedSpec: {
          name: "@joopo/discord",
          raw: "@joopo/discord",
          selectorKind: "none",
          selectorIsPrerelease: false,
        },
        resolution: {
          name: "@joopo/discord",
          version: "2026.5.2",
          resolvedSpec: "@joopo/discord@2026.5.2",
          resolvedAt: "2026-05-03T00:00:00.000Z",
        },
      }),
    ).toBe("2026.5.2");
  });

  it("reads installed dependency metadata from package-lock", async () => {
    const npmRoot = await makeTempRoot();
    await fs.writeFile(
      path.join(npmRoot, "package-lock.json"),
      `${JSON.stringify(
        {
          lockfileVersion: 3,
          packages: {
            "node_modules/@joopo/discord": {
              version: "2026.5.2",
              resolved: "https://registry.npmjs.org/@joopo/discord/-/discord-2026.5.2.tgz",
              integrity: "sha512-discord",
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    await expect(
      readManagedNpmRootInstalledDependency({
        npmRoot,
        packageName: "@joopo/discord",
      }),
    ).resolves.toEqual({
      version: "2026.5.2",
      resolved: "https://registry.npmjs.org/@joopo/discord/-/discord-2026.5.2.tgz",
      integrity: "sha512-discord",
    });
  });

  it("removes one managed dependency without dropping unrelated metadata", async () => {
    const npmRoot = await makeTempRoot();
    await fs.writeFile(
      path.join(npmRoot, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            "@joopo/discord": "2026.5.2",
            "@joopo/voice-call": "2026.5.2",
          },
          devDependencies: {
            fixture: "1.0.0",
          },
        },
        null,
        2,
      )}\n`,
    );

    await removeManagedNpmRootDependency({
      npmRoot,
      packageName: "@joopo/voice-call",
    });

    await expect(
      fs.readFile(path.join(npmRoot, "package.json"), "utf8").then((raw) => JSON.parse(raw)),
    ).resolves.toEqual({
      private: true,
      dependencies: {
        "@joopo/discord": "2026.5.2",
      },
      devDependencies: {
        fixture: "1.0.0",
      },
    });
  });

  it("repairs stale managed joopo peer state without dropping plugin packages", async () => {
    const npmRoot = await makeTempRoot();
    await fs.mkdir(path.join(npmRoot, "node_modules", "joopo"), { recursive: true });
    await fs.writeFile(
      path.join(npmRoot, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            joopo: "2026.5.4",
            "@joopo/discord": "2026.5.4",
          },
        },
        null,
        2,
      )}\n`,
    );
    await fs.writeFile(
      path.join(npmRoot, "package-lock.json"),
      `${JSON.stringify(
        {
          lockfileVersion: 3,
          packages: {
            "": {
              dependencies: {
                joopo: "2026.5.4",
                "@joopo/discord": "2026.5.4",
              },
            },
            "node_modules/joopo": {
              version: "2026.5.4",
            },
            "node_modules/@joopo/discord": {
              version: "2026.5.4",
            },
          },
          dependencies: {
            joopo: {
              version: "2026.5.4",
            },
          },
        },
        null,
        2,
      )}\n`,
    );
    await fs.writeFile(
      path.join(npmRoot, "node_modules", "joopo", "package.json"),
      `${JSON.stringify({ name: "joopo", version: "2026.5.4" })}\n`,
    );
    await fs.mkdir(path.join(npmRoot, "node_modules", ".bin"), { recursive: true });
    await fs.writeFile(path.join(npmRoot, "node_modules", ".bin", "joopo"), "shim");
    await fs.writeFile(path.join(npmRoot, "node_modules", ".bin", "joopo.cmd"), "cmd shim");
    await fs.writeFile(path.join(npmRoot, "node_modules", ".bin", "joopo.ps1"), "ps1 shim");
    await fs.writeFile(
      path.join(npmRoot, "node_modules", ".package-lock.json"),
      `${JSON.stringify(
        {
          lockfileVersion: 3,
          packages: {
            "node_modules/joopo": {
              version: "2026.5.4",
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const runCommand = vi.fn().mockResolvedValue(successfulSpawn);
    await expect(repairManagedNpmRootJoopoPeer({ npmRoot, runCommand })).resolves.toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      [
        "npm",
        "uninstall",
        "--loglevel=error",
        "--legacy-peer-deps",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--prefix",
        ".",
        "joopo",
      ],
      expect.objectContaining({
        cwd: npmRoot,
        env: expect.objectContaining({
          npm_config_legacy_peer_deps: "true",
        }),
      }),
    );

    const manifest = JSON.parse(await fs.readFile(path.join(npmRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies).toEqual({
      "@joopo/discord": "2026.5.4",
    });
    const lockfile = JSON.parse(
      await fs.readFile(path.join(npmRoot, "package-lock.json"), "utf8"),
    ) as {
      packages?: Record<string, { dependencies?: Record<string, string>; version?: string }>;
      dependencies?: Record<string, unknown>;
    };
    expect(lockfile.packages?.[""]?.dependencies).toEqual({
      "@joopo/discord": "2026.5.4",
    });
    expect(lockfile.packages?.["node_modules/joopo"]).toBeUndefined();
    expect(lockfile.packages?.["node_modules/@joopo/discord"]?.version).toBe("2026.5.4");
    expect(lockfile.dependencies?.joopo).toBeUndefined();
    await expect(fs.lstat(path.join(npmRoot, "node_modules", "joopo"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    for (const binName of ["joopo", "joopo.cmd", "joopo.ps1"]) {
      await expect(
        fs.lstat(path.join(npmRoot, "node_modules", ".bin", binName)),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
    await expect(
      fs.lstat(path.join(npmRoot, "node_modules", ".package-lock.json")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
