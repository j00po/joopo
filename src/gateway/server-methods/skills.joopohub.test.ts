import { beforeEach, describe, expect, it, vi } from "vitest";

const loadConfigMock = vi.fn(() => ({}));
const resolveDefaultAgentIdMock = vi.fn(() => "main");
const resolveAgentWorkspaceDirMock = vi.fn(() => "/tmp/workspace");
const installSkillFromJoopoHubMock = vi.fn();
const installSkillMock = vi.fn();
const updateSkillsFromJoopoHubMock = vi.fn();

vi.mock("../../config/config.js", () => ({
  getRuntimeConfig: () => loadConfigMock(),
  writeConfigFile: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: vi.fn(() => ["main"]),
  resolveDefaultAgentId: () => resolveDefaultAgentIdMock(),
  resolveAgentWorkspaceDir: () => resolveAgentWorkspaceDirMock(),
}));

vi.mock("../../agents/skills-joopohub.js", () => ({
  installSkillFromJoopoHub: (...args: unknown[]) => installSkillFromJoopoHubMock(...args),
  updateSkillsFromJoopoHub: (...args: unknown[]) => updateSkillsFromJoopoHubMock(...args),
}));

vi.mock("../../agents/skills-install.js", () => ({
  installSkill: (...args: unknown[]) => installSkillMock(...args),
}));

const { skillsHandlers } = await import("./skills.js");

const makeContext = () => ({ getRuntimeConfig: () => ({}) });

describe("skills gateway handlers (joopohub)", () => {
  beforeEach(() => {
    loadConfigMock.mockReset();
    resolveDefaultAgentIdMock.mockReset();
    resolveAgentWorkspaceDirMock.mockReset();
    installSkillFromJoopoHubMock.mockReset();
    installSkillMock.mockReset();
    updateSkillsFromJoopoHubMock.mockReset();

    loadConfigMock.mockReturnValue({});
    resolveDefaultAgentIdMock.mockReturnValue("main");
    resolveAgentWorkspaceDirMock.mockReturnValue("/tmp/workspace");
  });

  it("installs a JoopoHub skill through skills.install", async () => {
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace/skills/calendar",
    });

    let ok: boolean | null = null;
    let response: unknown;
    let error: unknown;
    await skillsHandlers["skills.install"]({
      params: {
        source: "joopohub",
        slug: "calendar",
        version: "1.2.3",
      },
      req: {} as never,
      client: null as never,
      isWebchatConnect: () => false,
      context: makeContext() as never,
      respond: (success, result, err) => {
        ok = success;
        response = result;
        error = err;
      },
    });

    expect(installSkillFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: "calendar",
      version: "1.2.3",
      force: false,
    });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toMatchObject({
      ok: true,
      message: "Installed calendar@1.2.3",
      slug: "calendar",
      version: "1.2.3",
    });
  });

  it("forwards dangerous override for local skill installs", async () => {
    installSkillMock.mockResolvedValue({
      ok: true,
      message: "Installed",
      stdout: "",
      stderr: "",
      code: 0,
    });

    let ok: boolean | null = null;
    let response: unknown;
    let error: unknown;
    await skillsHandlers["skills.install"]({
      params: {
        name: "calendar",
        installId: "deps",
        dangerouslyForceUnsafeInstall: true,
        timeoutMs: 120_000,
      },
      req: {} as never,
      client: null as never,
      isWebchatConnect: () => false,
      context: makeContext() as never,
      respond: (success, result, err) => {
        ok = success;
        response = result;
        error = err;
      },
    });

    expect(installSkillMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      skillName: "calendar",
      installId: "deps",
      dangerouslyForceUnsafeInstall: true,
      timeoutMs: 120_000,
      config: {},
    });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toMatchObject({
      ok: true,
      message: "Installed",
    });
  });

  it("updates JoopoHub skills through skills.update", async () => {
    updateSkillsFromJoopoHubMock.mockResolvedValue([
      {
        ok: true,
        slug: "calendar",
        previousVersion: "1.2.2",
        version: "1.2.3",
        changed: true,
        targetDir: "/tmp/workspace/skills/calendar",
      },
    ]);

    let ok: boolean | null = null;
    let response: unknown;
    let error: unknown;
    await skillsHandlers["skills.update"]({
      params: {
        source: "joopohub",
        slug: "calendar",
      },
      req: {} as never,
      client: null as never,
      isWebchatConnect: () => false,
      context: makeContext() as never,
      respond: (success, result, err) => {
        ok = success;
        response = result;
        error = err;
      },
    });

    expect(updateSkillsFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: "calendar",
    });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toMatchObject({
      ok: true,
      skillKey: "calendar",
      config: {
        source: "joopohub",
        results: [
          {
            ok: true,
            slug: "calendar",
            version: "1.2.3",
          },
        ],
      },
    });
  });

  it("rejects JoopoHub skills.update requests without slug or all", async () => {
    let ok: boolean | null = null;
    let error: { code?: string; message?: string } | undefined;
    await skillsHandlers["skills.update"]({
      params: {
        source: "joopohub",
      },
      req: {} as never,
      client: null as never,
      isWebchatConnect: () => false,
      context: makeContext() as never,
      respond: (success, _result, err) => {
        ok = success;
        error = err as { code?: string; message?: string } | undefined;
      },
    });

    expect(ok).toBe(false);
    expect(error?.message).toContain('requires "slug" or "all"');
    expect(updateSkillsFromJoopoHubMock).not.toHaveBeenCalled();
  });
});
