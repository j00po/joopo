import { describe, expect, it } from "vitest";
import {
  ensureJoopoExecMarkerOnProcess,
  markJoopoExecEnv,
  JOOPO_CLI_ENV_VALUE,
  JOOPO_CLI_ENV_VAR,
} from "./joopo-exec-env.js";

describe("markJoopoExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", JOOPO_CLI: "0" };
    const marked = markJoopoExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      JOOPO_CLI: JOOPO_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.JOOPO_CLI).toBe("0");
  });
});

describe("ensureJoopoExecMarkerOnProcess", () => {
  it.each([
    {
      name: "mutates and returns the provided process env",
      env: { PATH: "/usr/bin" } as NodeJS.ProcessEnv,
    },
    {
      name: "overwrites an existing marker on the provided process env",
      env: { PATH: "/usr/bin", [JOOPO_CLI_ENV_VAR]: "0" } as NodeJS.ProcessEnv,
    },
  ])("$name", ({ env }) => {
    expect(ensureJoopoExecMarkerOnProcess(env)).toBe(env);
    expect(env[JOOPO_CLI_ENV_VAR]).toBe(JOOPO_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[JOOPO_CLI_ENV_VAR];
    delete process.env[JOOPO_CLI_ENV_VAR];

    try {
      expect(ensureJoopoExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[JOOPO_CLI_ENV_VAR]).toBe(JOOPO_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[JOOPO_CLI_ENV_VAR];
      } else {
        process.env[JOOPO_CLI_ENV_VAR] = previous;
      }
    }
  });
});
