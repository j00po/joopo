import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildGatewayInstallEntrypointCandidates as resolveGatewayInstallEntrypointCandidates,
  resolveGatewayInstallEntrypoint,
} from "../../daemon/gateway-entrypoint.js";
import {
  collectMissingPluginInstallPayloads,
  recoverInstalledLaunchAgentAfterUpdate,
  recoverLaunchAgentAndRecheckGatewayHealth,
  resolvePostInstallDoctorEnv,
  shouldPrepareUpdatedInstallRestart,
  resolveUpdatedGatewayRestartPort,
  shouldUseLegacyProcessRestartAfterUpdate,
} from "./update-command.js";

describe("resolveGatewayInstallEntrypointCandidates", () => {
  it("prefers index.js before legacy entry.js", () => {
    expect(resolveGatewayInstallEntrypointCandidates("/tmp/joopo-root")).toEqual([
      path.join("/tmp/joopo-root", "dist", "index.js"),
      path.join("/tmp/joopo-root", "dist", "index.mjs"),
      path.join("/tmp/joopo-root", "dist", "entry.js"),
      path.join("/tmp/joopo-root", "dist", "entry.mjs"),
    ]);
  });
});

describe("resolveGatewayInstallEntrypoint", () => {
  it("prefers dist/index.js over dist/entry.js when both exist", async () => {
    const root = "/tmp/joopo-root";
    const indexPath = path.join(root, "dist", "index.js");
    const entryPath = path.join(root, "dist", "entry.js");

    await expect(
      resolveGatewayInstallEntrypoint(
        root,
        async (candidate) => candidate === indexPath || candidate === entryPath,
      ),
    ).resolves.toBe(indexPath);
  });

  it("falls back to dist/entry.js when index.js is missing", async () => {
    const root = "/tmp/joopo-root";
    const entryPath = path.join(root, "dist", "entry.js");

    await expect(
      resolveGatewayInstallEntrypoint(root, async (candidate) => candidate === entryPath),
    ).resolves.toBe(entryPath);
  });
});

describe("shouldPrepareUpdatedInstallRestart", () => {
  it("prepares package update restarts when the service is installed but stopped", () => {
    expect(
      shouldPrepareUpdatedInstallRestart({
        updateMode: "npm",
        serviceInstalled: true,
        serviceLoaded: false,
      }),
    ).toBe(true);
  });

  it("does not install a new service for package updates when no service exists", () => {
    expect(
      shouldPrepareUpdatedInstallRestart({
        updateMode: "npm",
        serviceInstalled: false,
        serviceLoaded: false,
      }),
    ).toBe(false);
  });

  it("keeps non-package updates tied to the loaded service state", () => {
    expect(
      shouldPrepareUpdatedInstallRestart({
        updateMode: "git",
        serviceInstalled: true,
        serviceLoaded: false,
      }),
    ).toBe(false);
    expect(
      shouldPrepareUpdatedInstallRestart({
        updateMode: "git",
        serviceInstalled: true,
        serviceLoaded: true,
      }),
    ).toBe(true);
  });
});

describe("resolveUpdatedGatewayRestartPort", () => {
  it("uses the managed service port ahead of the caller environment", () => {
    expect(
      resolveUpdatedGatewayRestartPort({
        config: { gateway: { port: 19000 } } as never,
        processEnv: { JOOPO_GATEWAY_PORT: "19001" },
        serviceEnv: { JOOPO_GATEWAY_PORT: "19002" },
      }),
    ).toBe(19002);
  });

  it("falls back to the post-update config when no service port is available", () => {
    expect(
      resolveUpdatedGatewayRestartPort({
        config: { gateway: { port: 19000 } } as never,
        processEnv: {},
        serviceEnv: {},
      }),
    ).toBe(19000);
  });
});

describe("resolvePostInstallDoctorEnv", () => {
  it("uses the managed service profile paths for post-install doctor", () => {
    const env = resolvePostInstallDoctorEnv({
      invocationCwd: "/srv/joopo",
      baseEnv: {
        PATH: "/bin",
        JOOPO_STATE_DIR: "/wrong/state",
        JOOPO_CONFIG_PATH: "/wrong/joopo.json",
        JOOPO_PROFILE: "wrong",
      },
      serviceEnv: {
        JOOPO_STATE_DIR: "daemon-state",
        JOOPO_CONFIG_PATH: "daemon-state/joopo.json",
        JOOPO_PROFILE: "work",
      },
    });

    expect(env.PATH).toBe("/bin");
    expect(env.NODE_DISABLE_COMPILE_CACHE).toBe("1");
    expect(env.JOOPO_STATE_DIR).toBe(path.join("/srv/joopo", "daemon-state"));
    expect(env.JOOPO_CONFIG_PATH).toBe(
      path.join("/srv/joopo", "daemon-state", "joopo.json"),
    );
    expect(env.JOOPO_PROFILE).toBe("work");
  });

  it("keeps the caller env when no managed service env is available", () => {
    const env = resolvePostInstallDoctorEnv({
      baseEnv: {
        PATH: "/bin",
        JOOPO_STATE_DIR: "/caller/state",
        JOOPO_PROFILE: "caller",
      },
    });

    expect(env.PATH).toBe("/bin");
    expect(env.NODE_DISABLE_COMPILE_CACHE).toBe("1");
    expect(env.JOOPO_STATE_DIR).toBe("/caller/state");
    expect(env.JOOPO_PROFILE).toBe("caller");
  });
});

describe("collectMissingPluginInstallPayloads", () => {
  it("reports tracked npm install records whose package payload is absent", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-update-plugin-payload-"));
    const presentDir = path.join(tmpDir, "state", "npm", "node_modules", "@joopo", "present");
    const missingDir = path.join(tmpDir, "state", "npm", "node_modules", "@joopo", "missing");
    const noPackageJsonDir = path.join(
      tmpDir,
      "state",
      "npm",
      "node_modules",
      "@joopo",
      "no-package-json",
    );
    try {
      await fs.mkdir(presentDir, { recursive: true });
      await fs.writeFile(path.join(presentDir, "package.json"), '{"name":"@joopo/present"}\n');
      await fs.mkdir(noPackageJsonDir, { recursive: true });

      await expect(
        collectMissingPluginInstallPayloads({
          env: { HOME: tmpDir } as NodeJS.ProcessEnv,
          records: {
            present: {
              source: "npm",
              spec: "@joopo/present@beta",
              installPath: presentDir,
            },
            missing: {
              source: "npm",
              spec: "@joopo/missing@beta",
              installPath: missingDir,
            },
            "no-package-json": {
              source: "npm",
              spec: "@joopo/no-package-json@beta",
              installPath: noPackageJsonDir,
            },
            "missing-install-path": {
              source: "npm",
              spec: "@joopo/missing-install-path@beta",
            },
            local: {
              source: "path",
              sourcePath: "/not/checked",
              installPath: "/not/checked",
            },
          },
        }),
      ).resolves.toEqual([
        {
          pluginId: "missing",
          installPath: missingDir,
          reason: "missing-package-dir",
        },
        {
          pluginId: "missing-install-path",
          reason: "missing-install-path",
        },
        {
          pluginId: "no-package-json",
          installPath: noPackageJsonDir,
          reason: "missing-package-json",
        },
      ]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips disabled tracked records when requested", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-update-plugin-payload-"));
    const missingDir = path.join(tmpDir, "state", "npm", "node_modules", "@joopo", "missing");
    try {
      await expect(
        collectMissingPluginInstallPayloads({
          env: { HOME: tmpDir } as NodeJS.ProcessEnv,
          skipDisabledPlugins: true,
          config: {
            plugins: {
              entries: {
                missing: {
                  enabled: false,
                },
              },
            },
          },
          records: {
            missing: {
              source: "npm",
              spec: "@joopo/missing@beta",
              installPath: missingDir,
            },
          },
        }),
      ).resolves.toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("keeps disabled trusted official npm records eligible for payload repair when requested", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-update-plugin-payload-"));
    const missingDir = path.join(tmpDir, "state", "npm", "node_modules", "@joopo", "codex");
    try {
      await expect(
        collectMissingPluginInstallPayloads({
          env: { HOME: tmpDir } as NodeJS.ProcessEnv,
          skipDisabledPlugins: true,
          syncOfficialPluginInstalls: true,
          config: {
            plugins: {
              entries: {
                codex: {
                  enabled: false,
                },
              },
            },
          },
          records: {
            codex: {
              source: "npm",
              spec: "@joopo/codex@2026.5.3",
              resolvedName: "@joopo/codex",
              resolvedSpec: "@joopo/codex@2026.5.3",
              installPath: missingDir,
            },
          },
        }),
      ).resolves.toEqual([
        {
          pluginId: "codex",
          installPath: missingDir,
          reason: "missing-package-dir",
        },
      ]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("keeps disabled trusted official ClawHub records eligible for payload repair when requested", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-update-plugin-payload-"));
    const missingDir = path.join(tmpDir, "state", "clawhub", "diagnostics-otel");
    try {
      await expect(
        collectMissingPluginInstallPayloads({
          env: { HOME: tmpDir } as NodeJS.ProcessEnv,
          skipDisabledPlugins: true,
          syncOfficialPluginInstalls: true,
          config: {
            plugins: {
              entries: {
                "diagnostics-otel": {
                  enabled: false,
                },
              },
            },
          },
          records: {
            "diagnostics-otel": {
              source: "clawhub",
              spec: "clawhub:@joopo/diagnostics-otel@2026.5.3",
              installPath: missingDir,
            },
          },
        }),
      ).resolves.toEqual([
        {
          pluginId: "diagnostics-otel",
          installPath: missingDir,
          reason: "missing-package-dir",
        },
      ]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("shouldUseLegacyProcessRestartAfterUpdate", () => {
  it("never restarts package updates through the pre-update process", () => {
    expect(shouldUseLegacyProcessRestartAfterUpdate({ updateMode: "npm" })).toBe(false);
    expect(shouldUseLegacyProcessRestartAfterUpdate({ updateMode: "pnpm" })).toBe(false);
    expect(shouldUseLegacyProcessRestartAfterUpdate({ updateMode: "bun" })).toBe(false);
  });

  it("keeps the in-process restart path for non-package updates", () => {
    expect(shouldUseLegacyProcessRestartAfterUpdate({ updateMode: "git" })).toBe(true);
    expect(shouldUseLegacyProcessRestartAfterUpdate({ updateMode: "unknown" })).toBe(true);
  });
});
describe("recoverInstalledLaunchAgentAfterUpdate", () => {
  it("re-bootstraps an installed-but-not-loaded macOS LaunchAgent after update", async () => {
    const service = {} as never;
    const serviceEnv = { JOOPO_PROFILE: "stomme" } as NodeJS.ProcessEnv;
    const recoveredEnv = { ...serviceEnv, JOOPO_PORT: "18790" } as NodeJS.ProcessEnv;
    const readState = vi.fn(async () => ({
      installed: true,
      loaded: false,
      running: false,
      env: recoveredEnv,
      command: null,
      runtime: { status: "unknown", missingSupervision: true },
    }));
    const recover = vi.fn(async () => ({
      result: "restarted" as const,
      loaded: true as const,
      message: "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.",
    }));

    await expect(
      recoverInstalledLaunchAgentAfterUpdate({
        service,
        env: serviceEnv,
        deps: {
          platform: "darwin",
          readState: readState as never,
          recover: recover as never,
        },
      }),
    ).resolves.toEqual({
      attempted: true,
      recovered: true,
      message: "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.",
    });

    expect(readState).toHaveBeenCalledWith(service, { env: serviceEnv });
    expect(recover).toHaveBeenCalledWith({ result: "restarted", env: recoveredEnv });
  });

  it("does not touch non-macOS service managers", async () => {
    const readState = vi.fn();
    const recover = vi.fn();

    await expect(
      recoverInstalledLaunchAgentAfterUpdate({
        service: {} as never,
        deps: {
          platform: "linux",
          readState: readState as never,
          recover: recover as never,
        },
      }),
    ).resolves.toEqual({ attempted: false, recovered: false });

    expect(readState).not.toHaveBeenCalled();
    expect(recover).not.toHaveBeenCalled();
  });

  it("does not recover a loaded LaunchAgent", async () => {
    const readState = vi.fn(async () => ({
      installed: true,
      loaded: true,
      running: true,
      env: { JOOPO_PROFILE: "stomme" } as NodeJS.ProcessEnv,
      command: null,
      runtime: { status: "running" },
    }));
    const recover = vi.fn();

    await expect(
      recoverInstalledLaunchAgentAfterUpdate({
        service: {} as never,
        deps: {
          platform: "darwin",
          readState: readState as never,
          recover: recover as never,
        },
      }),
    ).resolves.toEqual({ attempted: false, recovered: false });

    expect(recover).not.toHaveBeenCalled();
  });

  it("returns an explicit failed recovery state when bootstrap repair fails", async () => {
    const readState = vi.fn(async () => ({
      installed: true,
      loaded: false,
      running: false,
      env: { JOOPO_PROFILE: "stomme" } as NodeJS.ProcessEnv,
      command: null,
      runtime: { status: "unknown", missingSupervision: true },
    }));
    const recover = vi.fn(async () => null);

    await expect(
      recoverInstalledLaunchAgentAfterUpdate({
        service: {} as never,
        deps: {
          platform: "darwin",
          readState: readState as never,
          recover: recover as never,
        },
      }),
    ).resolves.toEqual({
      attempted: true,
      recovered: false,
      detail:
        "LaunchAgent was installed but not loaded; automatic bootstrap/kickstart recovery failed.",
    });
  });
});

describe("recoverLaunchAgentAndRecheckGatewayHealth", () => {
  it("does not report recovered update health until the gateway passes the post-recovery wait", async () => {
    const service = {} as never;
    const unhealthy = {
      runtime: { status: "stopped" },
      portUsage: { port: 18790, status: "free", listeners: [], hints: [] },
      healthy: false,
      staleGatewayPids: [],
      waitOutcome: "stopped-free",
    } as never;
    const healthy = {
      runtime: { status: "running", pid: 4242 },
      portUsage: { port: 18790, status: "busy", listeners: [{ pid: 4242 }], hints: [] },
      healthy: true,
      staleGatewayPids: [],
      gatewayVersion: "2026.5.3",
      waitOutcome: "healthy",
    } as never;
    const recoverLaunchAgent = vi.fn(async () => ({
      attempted: true as const,
      recovered: true as const,
      message: "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.",
    }));
    const waitForHealthy = vi.fn(async () => healthy);

    await expect(
      recoverLaunchAgentAndRecheckGatewayHealth({
        health: unhealthy,
        service,
        port: 18790,
        expectedVersion: "2026.5.3",
        env: { JOOPO_PROFILE: "stomme", JOOPO_PORT: "18790" },
        deps: { recoverLaunchAgent, waitForHealthy },
      }),
    ).resolves.toEqual({
      health: healthy,
      launchAgentRecovery: {
        attempted: true,
        recovered: true,
        message:
          "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.",
      },
    });

    expect(waitForHealthy).toHaveBeenCalledWith({
      service,
      port: 18790,
      expectedVersion: "2026.5.3",
      env: { JOOPO_PROFILE: "stomme", JOOPO_PORT: "18790" },
    });
  });

  it("keeps the update unhealthy when LaunchAgent repair succeeds but health does not recover", async () => {
    const service = {} as never;
    const unhealthySnapshot = {
      runtime: { status: "stopped" },
      portUsage: { port: 18790, status: "free", listeners: [], hints: [] },
      healthy: false,
      staleGatewayPids: [],
      waitOutcome: "stopped-free",
    };
    const unhealthy = unhealthySnapshot as never;
    const stillUnhealthy = {
      ...unhealthySnapshot,
      waitOutcome: "timeout",
    } as never;
    const recoverLaunchAgent = vi.fn(async () => ({
      attempted: true as const,
      recovered: true as const,
      message: "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.",
    }));
    const waitForHealthy = vi.fn(async () => stillUnhealthy);

    await expect(
      recoverLaunchAgentAndRecheckGatewayHealth({
        health: unhealthy,
        service,
        port: 18790,
        expectedVersion: "2026.5.3",
        deps: { recoverLaunchAgent, waitForHealthy },
      }),
    ).resolves.toMatchObject({
      health: { healthy: false, waitOutcome: "timeout" },
      launchAgentRecovery: { attempted: true, recovered: true },
    });
  });
});
