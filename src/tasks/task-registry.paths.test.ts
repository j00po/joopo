import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTaskStateDir } from "./task-registry.paths.js";

describe("task registry paths", () => {
  it("uses the Vitest worker id to shard test state dirs", () => {
    expect(
      resolveTaskStateDir({
        VITEST: "true",
        VITEST_POOL_ID: "7",
      } as NodeJS.ProcessEnv),
    ).toBe(path.join(os.tmpdir(), "joopo-test-state", `${process.pid}-7`));
  });

  it("prefers explicit state dir overrides over Vitest sharding", () => {
    expect(
      resolveTaskStateDir({
        JOOPO_STATE_DIR: "/tmp/joopo-custom-state",
        VITEST: "true",
        VITEST_POOL_ID: "7",
      } as NodeJS.ProcessEnv),
    ).toBe("/tmp/joopo-custom-state");
  });
});
