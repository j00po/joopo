import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withTempHome } from "../../config/home-env.test-harness.js";
import { createCommandWorkspaceHarness } from "./commands-filesystem.test-support.js";
import { handlePluginsCommand } from "./commands-plugins.js";
import { buildPluginsCommandParams } from "./commands.test-harness.js";

const {
  installPluginFromNpmSpecMock,
  installPluginFromPathMock,
  installPluginFromJoopoHubMock,
  installPluginFromGitSpecMock,
  persistPluginInstallMock,
} = vi.hoisted(() => ({
  installPluginFromNpmSpecMock: vi.fn(),
  installPluginFromPathMock: vi.fn(),
  installPluginFromJoopoHubMock: vi.fn(),
  installPluginFromGitSpecMock: vi.fn(),
  persistPluginInstallMock: vi.fn(),
}));

vi.mock("../../plugins/install.js", async () => {
  const actual = await vi.importActual<typeof import("../../plugins/install.js")>(
    "../../plugins/install.js",
  );
  return {
    ...actual,
    installPluginFromNpmSpec: installPluginFromNpmSpecMock,
    installPluginFromPath: installPluginFromPathMock,
  };
});

vi.mock("../../plugins/joopohub.js", async () => {
  const actual = await vi.importActual<typeof import("../../plugins/joopohub.js")>(
    "../../plugins/joopohub.js",
  );
  return {
    ...actual,
    installPluginFromJoopoHub: installPluginFromJoopoHubMock,
  };
});

vi.mock("../../plugins/git-install.js", async () => {
  const actual = await vi.importActual<typeof import("../../plugins/git-install.js")>(
    "../../plugins/git-install.js",
  );
  return {
    ...actual,
    installPluginFromGitSpec: installPluginFromGitSpecMock,
  };
});

vi.mock("../../cli/plugins-install-persist.js", () => ({
  persistPluginInstall: persistPluginInstallMock,
}));

const workspaceHarness = createCommandWorkspaceHarness("joopo-command-plugins-install-");

function buildPluginsParams(commandBodyNormalized: string, workspaceDir: string) {
  return buildPluginsCommandParams({
    commandBodyNormalized,
    workspaceDir,
    gatewayClientScopes: ["operator.admin", "operator.write", "operator.pairing"],
  });
}

describe("handleCommands /plugins install", () => {
  afterEach(async () => {
    installPluginFromNpmSpecMock.mockReset();
    installPluginFromPathMock.mockReset();
    installPluginFromJoopoHubMock.mockReset();
    installPluginFromGitSpecMock.mockReset();
    persistPluginInstallMock.mockReset();
    await workspaceHarness.cleanupWorkspaces();
  });

  it("installs a plugin from a local path", async () => {
    installPluginFromPathMock.mockResolvedValue({
      ok: true,
      pluginId: "path-install-plugin",
      targetDir: "/tmp/path-install-plugin",
      version: "0.0.1",
      extensions: ["index.js"],
    });
    persistPluginInstallMock.mockResolvedValue({});

    await withTempHome("joopo-command-plugins-home-", async () => {
      const workspaceDir = await workspaceHarness.createWorkspace();
      const pluginDir = path.join(workspaceDir, "fixtures", "path-install-plugin");
      await fs.mkdir(pluginDir, { recursive: true });

      const params = buildPluginsParams(`/plugins install ${pluginDir}`, workspaceDir);
      const result = await handlePluginsCommand(params, true);
      if (result === null) {
        throw new Error("expected plugin install result");
      }
      expect(result.reply?.text).toContain('Installed plugin "path-install-plugin"');
      expect(installPluginFromPathMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: pluginDir,
        }),
      );
      expect(persistPluginInstallMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: "path-install-plugin",
          install: expect.objectContaining({
            source: "path",
            sourcePath: pluginDir,
            installPath: "/tmp/path-install-plugin",
            version: "0.0.1",
          }),
        }),
      );
    });
  });

  it("installs from an explicit joopohub: spec", async () => {
    installPluginFromJoopoHubMock.mockResolvedValue({
      ok: true,
      pluginId: "joopohub-demo",
      targetDir: "/tmp/joopohub-demo",
      version: "1.2.3",
      extensions: ["index.js"],
      packageName: "@joopo/joopohub-demo",
      joopohub: {
        source: "joopohub",
        joopohubUrl: "https://joopohub.ai",
        joopohubPackage: "@joopo/joopohub-demo",
        joopohubFamily: "code-plugin",
        joopohubChannel: "official",
        version: "1.2.3",
        integrity: "sha512-demo",
        resolvedAt: "2026-03-22T12:00:00.000Z",
      },
    });
    persistPluginInstallMock.mockResolvedValue({});

    await withTempHome("joopo-command-plugins-home-", async () => {
      const workspaceDir = await workspaceHarness.createWorkspace();
      const params = buildPluginsParams(
        "/plugins install joopohub:@joopo/joopohub-demo@1.2.3",
        workspaceDir,
      );
      const result = await handlePluginsCommand(params, true);
      if (result === null) {
        throw new Error("expected plugin install result");
      }
      expect(result.reply?.text).toContain('Installed plugin "joopohub-demo"');
      expect(installPluginFromJoopoHubMock).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: "joopohub:@joopo/joopohub-demo@1.2.3",
        }),
      );
      expect(persistPluginInstallMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: "joopohub-demo",
          install: expect.objectContaining({
            source: "joopohub",
            spec: "joopohub:@joopo/joopohub-demo@1.2.3",
            installPath: "/tmp/joopohub-demo",
            version: "1.2.3",
            integrity: "sha512-demo",
            joopohubPackage: "@joopo/joopohub-demo",
            joopohubChannel: "official",
          }),
        }),
      );
    });
  });

  it("refuses plugin installs in Nix mode before package installer side effects", async () => {
    const previousNixMode = process.env.JOOPO_NIX_MODE;
    process.env.JOOPO_NIX_MODE = "1";
    try {
      await withTempHome("joopo-command-plugins-home-", async () => {
        const workspaceDir = await workspaceHarness.createWorkspace();
        const params = buildPluginsParams("/plugins install @acme/demo", workspaceDir);
        const result = await handlePluginsCommand(params, true);
        if (result === null) {
          throw new Error("expected plugin install result");
        }

        expect(result.reply?.text).toContain("JOOPO_NIX_MODE=1");
        expect(result.reply?.text).toContain("nix-joopo#quick-start");
        expect(installPluginFromNpmSpecMock).not.toHaveBeenCalled();
        expect(installPluginFromPathMock).not.toHaveBeenCalled();
        expect(installPluginFromJoopoHubMock).not.toHaveBeenCalled();
        expect(installPluginFromGitSpecMock).not.toHaveBeenCalled();
        expect(persistPluginInstallMock).not.toHaveBeenCalled();
      });
    } finally {
      if (previousNixMode === undefined) {
        delete process.env.JOOPO_NIX_MODE;
      } else {
        process.env.JOOPO_NIX_MODE = previousNixMode;
      }
    }
  });

  it("installs from an explicit git: spec", async () => {
    installPluginFromGitSpecMock.mockResolvedValue({
      ok: true,
      pluginId: "git-demo",
      targetDir: "/tmp/git-demo",
      version: "1.2.3",
      extensions: ["index.js"],
      git: {
        url: "https://github.com/acme/git-demo.git",
        ref: "v1.2.3",
        commit: "abc123",
        resolvedAt: "2026-04-30T12:00:00.000Z",
      },
    });
    persistPluginInstallMock.mockResolvedValue({});

    await withTempHome("joopo-command-plugins-home-", async () => {
      const workspaceDir = await workspaceHarness.createWorkspace();
      const params = buildPluginsParams(
        "/plugins install git:github.com/acme/git-demo@v1.2.3",
        workspaceDir,
      );
      const result = await handlePluginsCommand(params, true);
      if (result === null) {
        throw new Error("expected plugin install result");
      }
      expect(result.reply?.text).toContain('Installed plugin "git-demo"');
      expect(installPluginFromGitSpecMock).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: "git:github.com/acme/git-demo@v1.2.3",
        }),
      );
      expect(persistPluginInstallMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: "git-demo",
          install: expect.objectContaining({
            source: "git",
            spec: "git:github.com/acme/git-demo@v1.2.3",
            installPath: "/tmp/git-demo",
            version: "1.2.3",
            gitUrl: "https://github.com/acme/git-demo.git",
            gitRef: "v1.2.3",
            gitCommit: "abc123",
          }),
        }),
      );
    });
  });

  it("treats /plugin add as an install alias", async () => {
    installPluginFromJoopoHubMock.mockResolvedValue({
      ok: true,
      pluginId: "alias-demo",
      targetDir: "/tmp/alias-demo",
      version: "1.0.0",
      extensions: ["index.js"],
      packageName: "@joopo/alias-demo",
      joopohub: {
        source: "joopohub",
        joopohubUrl: "https://joopohub.ai",
        joopohubPackage: "@joopo/alias-demo",
        joopohubFamily: "code-plugin",
        joopohubChannel: "official",
        version: "1.0.0",
        integrity: "sha512-alias",
        resolvedAt: "2026-03-23T12:00:00.000Z",
      },
    });
    persistPluginInstallMock.mockResolvedValue({});

    await withTempHome("joopo-command-plugins-home-", async () => {
      const workspaceDir = await workspaceHarness.createWorkspace();
      const params = buildPluginsParams(
        "/plugin add joopohub:@joopo/alias-demo@1.0.0",
        workspaceDir,
      );
      const result = await handlePluginsCommand(params, true);
      if (result === null) {
        throw new Error("expected plugin install result");
      }
      expect(result.reply?.text).toContain('Installed plugin "alias-demo"');
      expect(installPluginFromJoopoHubMock).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: "joopohub:@joopo/alias-demo@1.0.0",
        }),
      );
    });
  });

  it("trusts catalog npm package installs with alternate selectors", async () => {
    installPluginFromNpmSpecMock.mockResolvedValue({
      ok: true,
      pluginId: "wecom-joopo-plugin",
      targetDir: "/tmp/wecom-joopo-plugin",
      version: "2026.4.23",
      extensions: ["index.js"],
      npmResolution: {
        name: "@wecom/wecom-joopo-plugin",
        version: "2026.4.23",
        resolvedSpec: "@wecom/wecom-joopo-plugin@2026.4.23",
        integrity: "sha512-wecom",
        resolvedAt: "2026-05-04T20:00:00.000Z",
      },
    });
    persistPluginInstallMock.mockResolvedValue({});

    await withTempHome("joopo-command-plugins-home-", async () => {
      const workspaceDir = await workspaceHarness.createWorkspace();
      const params = buildPluginsParams(
        "/plugins install @wecom/wecom-joopo-plugin@latest",
        workspaceDir,
      );
      const result = await handlePluginsCommand(params, true);
      if (result === null) {
        throw new Error("expected plugin install result");
      }
      expect(result.reply?.text).toContain('Installed plugin "wecom-joopo-plugin"');
      expect(installPluginFromNpmSpecMock).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: "@wecom/wecom-joopo-plugin@latest",
          expectedPluginId: "wecom-joopo-plugin",
          trustedSourceLinkedOfficialInstall: true,
        }),
      );
      expect(installPluginFromNpmSpecMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          expectedIntegrity: expect.any(String),
        }),
      );
      expect(persistPluginInstallMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: "wecom-joopo-plugin",
          install: expect.objectContaining({
            source: "npm",
            spec: "@wecom/wecom-joopo-plugin@latest",
            installPath: "/tmp/wecom-joopo-plugin",
            version: "2026.4.23",
            resolvedName: "@wecom/wecom-joopo-plugin",
            resolvedVersion: "2026.4.23",
          }),
        }),
      );
    });
  });
});
