import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "joopo",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "joopo", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "joopo",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "joopo",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "joopo", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "joopo", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "joopo", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "joopo", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "joopo", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "joopo", "status", "--deep"]);
  });

  it("preserves Matrix QA --profile for the command parser", () => {
    const res = parseCliProfileArgs([
      "node",
      "joopo",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "joopo",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
  });

  it("preserves Matrix QA --profile after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "joopo",
      "--no-color",
      "qa",
      "matrix",
      "--profile=fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "joopo", "--no-color", "qa", "matrix", "--profile=fast"]);
  });

  it("still parses root --profile before Matrix QA", () => {
    const res = parseCliProfileArgs([
      "node",
      "joopo",
      "--profile",
      "work",
      "qa",
      "matrix",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "joopo", "qa", "matrix", "--fail-fast"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "joopo", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "joopo", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "joopo", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "joopo", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "joopo", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "joopo", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".joopo-dev");
    expect(env.JOOPO_PROFILE).toBe("dev");
    expect(env.JOOPO_STATE_DIR).toBe(expectedStateDir);
    expect(env.JOOPO_CONFIG_PATH).toBe(path.join(expectedStateDir, "joopo.json"));
    expect(env.JOOPO_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      JOOPO_STATE_DIR: "/custom",
      JOOPO_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.JOOPO_STATE_DIR).toBe("/custom");
    expect(env.JOOPO_GATEWAY_PORT).toBe("19099");
    expect(env.JOOPO_CONFIG_PATH).toBe(path.join("/custom", "joopo.json"));
  });

  it("uses JOOPO_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      JOOPO_HOME: "/srv/joopo-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/joopo-home");
    expect(env.JOOPO_STATE_DIR).toBe(path.join(resolvedHome, ".joopo-work"));
    expect(env.JOOPO_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".joopo-work", "joopo.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "joopo doctor --fix",
      env: {},
      expected: "joopo doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "joopo doctor --fix",
      env: { JOOPO_PROFILE: "default" },
      expected: "joopo doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "joopo doctor --fix",
      env: { JOOPO_PROFILE: "Default" },
      expected: "joopo doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "joopo doctor --fix",
      env: { JOOPO_PROFILE: "bad profile" },
      expected: "joopo doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "joopo --profile work doctor --fix",
      env: { JOOPO_PROFILE: "work" },
      expected: "joopo --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "joopo --dev doctor",
      env: { JOOPO_PROFILE: "dev" },
      expected: "joopo --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("joopo doctor --fix", { JOOPO_PROFILE: "work" })).toBe(
      "joopo --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("joopo doctor --fix", { JOOPO_PROFILE: "  jbjoopo  " })).toBe(
      "joopo --profile jbjoopo doctor --fix",
    );
  });

  it("handles command with no args after joopo", () => {
    expect(formatCliCommand("joopo", { JOOPO_PROFILE: "test" })).toBe(
      "joopo --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm joopo doctor", { JOOPO_PROFILE: "work" })).toBe(
      "pnpm joopo --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("joopo gateway status --deep", { JOOPO_CONTAINER_HINT: "demo" }),
    ).toBe("joopo --container demo gateway status --deep");
  });

  it("ignores unsafe container hints", () => {
    expect(
      formatCliCommand("joopo gateway status --deep", {
        JOOPO_CONTAINER_HINT: "demo; rm -rf /",
      }),
    ).toBe("joopo gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("joopo doctor", {
        JOOPO_CONTAINER_HINT: "demo",
        JOOPO_PROFILE: "work",
      }),
    ).toBe("joopo --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("joopo update", { JOOPO_CONTAINER_HINT: "demo" })).toBe(
      "joopo update",
    );
    expect(
      formatCliCommand("pnpm joopo update --channel beta", { JOOPO_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm joopo update --channel beta");
  });
});
