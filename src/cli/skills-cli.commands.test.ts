import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSkillsCli } from "./skills-cli.js";

const mocks = vi.hoisted(() => {
  const runtimeLogs: string[] = [];
  const runtimeStdout: string[] = [];
  const runtimeErrors: string[] = [];
  const stringifyArgs = (args: unknown[]) => args.map((value) => String(value)).join(" ");
  const skillStatusReportFixture = {
    workspaceDir: "/tmp/workspace",
    managedSkillsDir: "/tmp/workspace/skills",
    skills: [
      {
        name: "calendar",
        description: "Calendar helpers",
        source: "bundled",
        bundled: false,
        filePath: "/tmp/workspace/skills/calendar/SKILL.md",
        baseDir: "/tmp/workspace/skills/calendar",
        skillKey: "calendar",
        emoji: "📅",
        homepage: "https://example.com/calendar",
        always: false,
        disabled: false,
        blockedByAllowlist: false,
        eligible: true,
        primaryEnv: "CALENDAR_API_KEY",
        requirements: {
          bins: [],
          anyBins: [],
          env: ["CALENDAR_API_KEY"],
          config: [],
          os: [],
        },
        missing: {
          bins: [],
          anyBins: [],
          env: [],
          config: [],
          os: [],
        },
        configChecks: [],
        install: [],
      },
    ],
  };
  const defaultRuntime = {
    log: vi.fn((...args: unknown[]) => {
      runtimeLogs.push(stringifyArgs(args));
    }),
    error: vi.fn((...args: unknown[]) => {
      runtimeErrors.push(stringifyArgs(args));
    }),
    writeStdout: vi.fn((value: string) => {
      runtimeStdout.push(value.endsWith("\n") ? value.slice(0, -1) : value);
    }),
    writeJson: vi.fn((value: unknown, space = 2) => {
      runtimeStdout.push(JSON.stringify(value, null, space > 0 ? space : undefined));
    }),
    exit: vi.fn((code: number) => {
      if (code === 0) {
        return;
      }
      throw new Error(`__exit__:${code}`);
    }),
  };
  const buildWorkspaceSkillStatusMock = vi.fn((workspaceDir: string, options?: unknown) => {
    void workspaceDir;
    void options;
    return skillStatusReportFixture;
  });
  return {
    loadConfigMock: vi.fn(() => ({})),
    resolveDefaultAgentIdMock: vi.fn((_config: unknown) => "main"),
    resolveAgentIdByWorkspacePathMock: vi.fn(
      (_config: unknown, _workspacePath: string): string | undefined => undefined,
    ),
    resolveAgentWorkspaceDirMock: vi.fn((_config: unknown, _agentId: string) => "/tmp/workspace"),
    searchSkillsFromJoopoHubMock: vi.fn(),
    installSkillFromJoopoHubMock: vi.fn(),
    updateSkillsFromJoopoHubMock: vi.fn(),
    readTrackedJoopoHubSkillSlugsMock: vi.fn(),
    buildWorkspaceSkillStatusMock,
    skillStatusReportFixture,
    defaultRuntime,
    runtimeLogs,
    runtimeStdout,
    runtimeErrors,
  };
});

const {
  loadConfigMock,
  resolveDefaultAgentIdMock,
  resolveAgentIdByWorkspacePathMock,
  resolveAgentWorkspaceDirMock,
  searchSkillsFromJoopoHubMock,
  installSkillFromJoopoHubMock,
  updateSkillsFromJoopoHubMock,
  readTrackedJoopoHubSkillSlugsMock,
  buildWorkspaceSkillStatusMock,
  skillStatusReportFixture,
  defaultRuntime,
  runtimeLogs,
  runtimeStdout,
  runtimeErrors,
} = mocks;

vi.mock("../runtime.js", () => ({
  defaultRuntime: mocks.defaultRuntime,
}));

vi.mock("../config/config.js", () => ({
  getRuntimeConfig: () => mocks.loadConfigMock(),
  loadConfig: () => mocks.loadConfigMock(),
}));

vi.mock("../agents/agent-scope.js", () => ({
  resolveAgentIdByWorkspacePath: (config: unknown, workspacePath: string) =>
    mocks.resolveAgentIdByWorkspacePathMock(config, workspacePath),
  resolveDefaultAgentId: (config: unknown) => mocks.resolveDefaultAgentIdMock(config),
  resolveAgentWorkspaceDir: (config: unknown, agentId: string) =>
    mocks.resolveAgentWorkspaceDirMock(config, agentId),
}));

vi.mock("../agents/skills-joopohub.js", () => ({
  searchSkillsFromJoopoHub: (...args: unknown[]) => mocks.searchSkillsFromJoopoHubMock(...args),
  installSkillFromJoopoHub: (...args: unknown[]) => mocks.installSkillFromJoopoHubMock(...args),
  updateSkillsFromJoopoHub: (...args: unknown[]) => mocks.updateSkillsFromJoopoHubMock(...args),
  readTrackedJoopoHubSkillSlugs: (...args: unknown[]) =>
    mocks.readTrackedJoopoHubSkillSlugsMock(...args),
}));

vi.mock("../agents/skills-status.js", () => ({
  buildWorkspaceSkillStatus: (workspaceDir: string, options?: unknown) =>
    mocks.buildWorkspaceSkillStatusMock(workspaceDir, options),
}));

describe("skills cli commands", () => {
  const createProgram = () => {
    const program = new Command();
    program.exitOverride();
    registerSkillsCli(program);
    return program;
  };

  const runCommand = async (argv: string[]) => {
    try {
      await createProgram().parseAsync(argv, { from: "user" });
    } catch (error) {
      if (error instanceof Error && error.message === "__exit__:0") {
        return;
      }
      throw error;
    }
  };

  beforeEach(() => {
    runtimeLogs.length = 0;
    runtimeStdout.length = 0;
    runtimeErrors.length = 0;
    loadConfigMock.mockReset();
    resolveDefaultAgentIdMock.mockReset();
    resolveAgentIdByWorkspacePathMock.mockReset();
    resolveAgentWorkspaceDirMock.mockReset();
    searchSkillsFromJoopoHubMock.mockReset();
    installSkillFromJoopoHubMock.mockReset();
    updateSkillsFromJoopoHubMock.mockReset();
    readTrackedJoopoHubSkillSlugsMock.mockReset();
    buildWorkspaceSkillStatusMock.mockReset();

    loadConfigMock.mockReturnValue({});
    resolveDefaultAgentIdMock.mockReturnValue("main");
    resolveAgentIdByWorkspacePathMock.mockReturnValue(undefined);
    resolveAgentWorkspaceDirMock.mockReturnValue("/tmp/workspace");
    searchSkillsFromJoopoHubMock.mockResolvedValue([]);
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: false,
      error: "install disabled in test",
    });
    updateSkillsFromJoopoHubMock.mockResolvedValue([]);
    readTrackedJoopoHubSkillSlugsMock.mockResolvedValue([]);
    buildWorkspaceSkillStatusMock.mockReturnValue(skillStatusReportFixture);
    defaultRuntime.log.mockClear();
    defaultRuntime.error.mockClear();
    defaultRuntime.writeStdout.mockClear();
    defaultRuntime.writeJson.mockClear();
    defaultRuntime.exit.mockClear();
  });

  async function withCwd(cwd: string, run: () => Promise<void>) {
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(cwd);
    try {
      await run();
    } finally {
      cwdSpy.mockRestore();
    }
  }

  function routeWorkspaceByAgent() {
    resolveAgentWorkspaceDirMock.mockImplementation(
      (_config: unknown, agentId: string) => `/tmp/workspace-${agentId}`,
    );
  }

  it("searches JoopoHub skills from the native CLI", async () => {
    searchSkillsFromJoopoHubMock.mockResolvedValue([
      {
        slug: "calendar",
        displayName: "Calendar",
        summary: "CalDAV helpers",
        version: "1.2.3",
      },
    ]);

    await runCommand(["skills", "search", "calendar"]);

    expect(searchSkillsFromJoopoHubMock).toHaveBeenCalledWith({
      query: "calendar",
      limit: undefined,
    });
    expect(runtimeLogs.some((line) => line.includes("calendar v1.2.3  Calendar"))).toBe(true);
  });

  it("installs a skill from JoopoHub into the active workspace", async () => {
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace/skills/calendar",
    });

    await runCommand(["skills", "install", "calendar", "--version", "1.2.3"]);

    expect(installSkillFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: "calendar",
      version: "1.2.3",
      force: false,
      logger: expect.any(Object),
    });
    expect(
      runtimeLogs.some((line) =>
        line.includes("Installed calendar@1.2.3 -> /tmp/workspace/skills/calendar"),
      ),
    ).toBe(true);
  });

  it("installs a skill into the cwd-inferred agent workspace", async () => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("writer");
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace-writer/skills/calendar",
    });

    await withCwd("/tmp/workspace-writer/project", async () => {
      await runCommand(["skills", "install", "calendar"]);
    });

    expect(resolveAgentIdByWorkspacePathMock).toHaveBeenCalledWith(
      {},
      "/tmp/workspace-writer/project",
    );
    expect(installSkillFromJoopoHubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceDir: "/tmp/workspace-writer",
      }),
    );
  });

  it("lets --agent override cwd-inferred workspace for installs", async () => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("writer");
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace-main/skills/calendar",
    });

    await withCwd("/tmp/workspace-writer", async () => {
      await runCommand(["skills", "install", "calendar", "--agent", "main"]);
    });

    expect(resolveAgentIdByWorkspacePathMock).not.toHaveBeenCalled();
    expect(resolveAgentWorkspaceDirMock).toHaveBeenCalledWith({}, "main");
    expect(installSkillFromJoopoHubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceDir: "/tmp/workspace-main",
      }),
    );
  });

  it("honors parent --agent for subcommands", async () => {
    routeWorkspaceByAgent();
    installSkillFromJoopoHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace-writer/skills/calendar",
    });

    await runCommand(["skills", "--agent", "writer", "install", "calendar"]);

    expect(resolveAgentWorkspaceDirMock).toHaveBeenCalledWith({}, "writer");
    expect(installSkillFromJoopoHubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceDir: "/tmp/workspace-writer",
      }),
    );
  });

  it("updates all tracked JoopoHub skills", async () => {
    readTrackedJoopoHubSkillSlugsMock.mockResolvedValue(["calendar"]);
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

    await runCommand(["skills", "update", "--all"]);

    expect(readTrackedJoopoHubSkillSlugsMock).toHaveBeenCalledWith("/tmp/workspace");
    expect(updateSkillsFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: undefined,
      logger: expect.any(Object),
    });
    expect(runtimeLogs.some((line) => line.includes("Updated calendar: 1.2.2 -> 1.2.3"))).toBe(
      true,
    );
    expect(runtimeErrors).toEqual([]);
  });

  it("updates tracked JoopoHub skills in the cwd-inferred agent workspace", async () => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("writer");
    readTrackedJoopoHubSkillSlugsMock.mockResolvedValue(["calendar"]);
    updateSkillsFromJoopoHubMock.mockResolvedValue([
      {
        ok: true,
        slug: "calendar",
        previousVersion: "1.2.2",
        version: "1.2.3",
        changed: true,
        targetDir: "/tmp/workspace-writer/skills/calendar",
      },
    ]);

    await withCwd("/tmp/workspace-writer", async () => {
      await runCommand(["skills", "update", "--all"]);
    });

    expect(readTrackedJoopoHubSkillSlugsMock).toHaveBeenCalledWith("/tmp/workspace-writer");
    expect(updateSkillsFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace-writer",
      slug: undefined,
      logger: expect.any(Object),
    });
  });

  it("lets --agent override cwd-inferred workspace for updates", async () => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("writer");
    readTrackedJoopoHubSkillSlugsMock.mockResolvedValue(["calendar"]);
    updateSkillsFromJoopoHubMock.mockResolvedValue([
      {
        ok: true,
        slug: "calendar",
        previousVersion: "1.2.2",
        version: "1.2.3",
        changed: true,
        targetDir: "/tmp/workspace-main/skills/calendar",
      },
    ]);

    await withCwd("/tmp/workspace-writer", async () => {
      await runCommand(["skills", "update", "calendar", "--agent", "main"]);
    });

    expect(resolveAgentIdByWorkspacePathMock).not.toHaveBeenCalled();
    expect(updateSkillsFromJoopoHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace-main",
      slug: "calendar",
      logger: expect.any(Object),
    });
  });

  it.each([
    {
      label: "list",
      argv: ["skills", "list", "--json"],
      assert: (payload: Record<string, unknown>) => {
        const skills = payload.skills as Array<Record<string, unknown>>;
        expect(skills).toHaveLength(1);
        expect(skills[0]?.name).toBe("calendar");
      },
    },
    {
      label: "info",
      argv: ["skills", "info", "calendar", "--json"],
      assert: (payload: Record<string, unknown>) => {
        expect(payload.name).toBe("calendar");
        expect(payload.primaryEnv).toBe("CALENDAR_API_KEY");
      },
    },
    {
      label: "check",
      argv: ["skills", "check", "--json"],
      assert: (payload: Record<string, unknown>) => {
        expect(payload.summary).toMatchObject({
          total: 1,
          eligible: 1,
        });
      },
    },
  ])("routes skills $label JSON output through stdout", async ({ argv, assert }) => {
    await runCommand(argv);

    expect(buildWorkspaceSkillStatusMock).toHaveBeenCalledWith(
      "/tmp/workspace",
      expect.objectContaining({ config: {} }),
    );
    expect(
      defaultRuntime.writeStdout.mock.calls.length + defaultRuntime.writeJson.mock.calls.length,
    ).toBeGreaterThan(0);
    expect(defaultRuntime.log).not.toHaveBeenCalled();
    expect(runtimeErrors).toEqual([]);
    expect(runtimeStdout.length).toBeGreaterThan(0);

    const payload = JSON.parse(runtimeStdout.at(-1) ?? "{}") as Record<string, unknown>;
    assert(payload);
  });

  it.each([
    ["list", ["skills", "list", "--json"]],
    ["info", ["skills", "info", "calendar", "--json"]],
    ["check", ["skills", "check", "--json"]],
    ["default", ["skills"]],
  ])("routes skills %s through the cwd-inferred agent workspace", async (_label, argv) => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("writer");

    await withCwd("/tmp/workspace-writer", async () => {
      await runCommand(argv);
    });

    expect(buildWorkspaceSkillStatusMock).toHaveBeenCalledWith(
      "/tmp/workspace-writer",
      expect.objectContaining({ config: {} }),
    );
  });

  it.each([
    ["list", ["skills", "list", "--agent", "writer", "--json"]],
    ["info", ["skills", "info", "calendar", "--agent", "writer", "--json"]],
    ["check", ["skills", "check", "--agent", "writer", "--json"]],
    ["default", ["skills", "--agent", "writer"]],
  ])("routes skills %s through the explicit agent workspace", async (_label, argv) => {
    routeWorkspaceByAgent();
    resolveAgentIdByWorkspacePathMock.mockReturnValue("main");

    await withCwd("/tmp/workspace-main", async () => {
      await runCommand(argv);
    });

    expect(resolveAgentIdByWorkspacePathMock).not.toHaveBeenCalled();
    expect(buildWorkspaceSkillStatusMock).toHaveBeenCalledWith(
      "/tmp/workspace-writer",
      expect.objectContaining({ config: {} }),
    );
  });

  it("falls back to the default agent outside configured workspaces", async () => {
    routeWorkspaceByAgent();
    resolveDefaultAgentIdMock.mockReturnValue("main");
    resolveAgentIdByWorkspacePathMock.mockReturnValue(undefined);

    await withCwd("/tmp/unrelated", async () => {
      await runCommand(["skills", "list", "--json"]);
    });

    expect(resolveAgentIdByWorkspacePathMock).toHaveBeenCalledWith({}, "/tmp/unrelated");
    expect(resolveDefaultAgentIdMock).toHaveBeenCalledWith({});
    expect(buildWorkspaceSkillStatusMock).toHaveBeenCalledWith(
      "/tmp/workspace-main",
      expect.objectContaining({ config: {} }),
    );
  });

  it("keeps non-JSON skills list output on stdout with human-readable formatting", async () => {
    await runCommand(["skills", "list"]);

    expect(defaultRuntime.writeStdout).toHaveBeenCalledTimes(1);
    expect(defaultRuntime.log).not.toHaveBeenCalled();
    expect(runtimeErrors).toEqual([]);
    expect(runtimeStdout.at(-1)).toContain("calendar");
    expect(runtimeStdout.at(-1)).toContain("joopo skills search");
  });
});
