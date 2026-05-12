import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { withTempHome } from "joopo/plugin-sdk/test-env";
import { describe, expect, it } from "vitest";

describe("cli json stdout contract", () => {
  it("keeps `update status --json` stdout parseable even with legacy doctor preflight inputs", async () => {
    await withTempHome(
      async (tempHome) => {
        const legacyDir = path.join(tempHome, ".joopobot");
        await fs.mkdir(legacyDir, { recursive: true });
        await fs.writeFile(path.join(legacyDir, "joopobot.json"), "{}", "utf8");

        const env = {
          ...process.env,
          HOME: tempHome,
          USERPROFILE: tempHome,
          JOOPO_TEST_FAST: "1",
        };
        delete env.JOOPO_HOME;
        delete env.JOOPO_STATE_DIR;
        delete env.JOOPO_CONFIG_PATH;
        delete env.VITEST;

        const entry = path.resolve(process.cwd(), "joopo.mjs");
        const result = spawnSync(
          process.execPath,
          [entry, "update", "status", "--json", "--timeout", "1"],
          { cwd: process.cwd(), env, encoding: "utf8" },
        );

        expect(result.status).toBe(0);
        const stdout = result.stdout.trim();
        expect(stdout.length).toBeGreaterThan(0);
        const parsed = JSON.parse(stdout) as unknown;
        expect(parsed).toEqual(expect.any(Object));
        expect(stdout).not.toContain("Doctor warnings");
        expect(stdout).not.toContain("Doctor changes");
        expect(stdout).not.toContain("Config invalid");
      },
      { prefix: "joopo-json-e2e-" },
    );
  });
});
