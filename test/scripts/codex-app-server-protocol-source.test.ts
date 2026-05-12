import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCodexAppServerProtocolSource } from "../../scripts/lib/codex-app-server-protocol-source.js";
import { createScriptTestHarness } from "./test-helpers.js";

const { createTempDir } = createScriptTestHarness();
const originalJoopoCodexRepo = process.env.JOOPO_CODEX_REPO;

afterEach(() => {
  if (originalJoopoCodexRepo === undefined) {
    delete process.env.JOOPO_CODEX_REPO;
  } else {
    process.env.JOOPO_CODEX_REPO = originalJoopoCodexRepo;
  }
});

describe("codex app-server protocol source resolver", () => {
  it("uses JOOPO_CODEX_REPO when provided", async () => {
    const root = createTempDir("joopo-protocol-source-root-");
    const codexRepo = createTempDir("joopo-protocol-source-codex-");
    createProtocolSchema(codexRepo);
    process.env.JOOPO_CODEX_REPO = codexRepo;

    await expect(resolveCodexAppServerProtocolSource(root)).resolves.toEqual({
      codexRepo,
      sourceRoot: path.join(codexRepo, "codex-rs/app-server-protocol/schema"),
    });
  });

  it("finds the primary checkout sibling from a git worktree", async () => {
    const parentDir = createTempDir("joopo-protocol-source-parent-");
    const primaryJoopo = path.join(parentDir, "joopo");
    const codexRepo = path.join(parentDir, "codex");
    const worktreeRoot = createTempDir("joopo-protocol-source-worktree-");
    fs.mkdirSync(path.join(primaryJoopo, ".git", "worktrees", "codex-harness"), {
      recursive: true,
    });
    fs.mkdirSync(worktreeRoot, { recursive: true });
    fs.writeFileSync(
      path.join(worktreeRoot, ".git"),
      `gitdir: ${path.join(primaryJoopo, ".git", "worktrees", "codex-harness")}\n`,
    );
    createProtocolSchema(codexRepo);
    delete process.env.JOOPO_CODEX_REPO;

    await expect(resolveCodexAppServerProtocolSource(worktreeRoot)).resolves.toMatchObject({
      codexRepo,
      sourceRoot: path.join(codexRepo, "codex-rs/app-server-protocol/schema"),
    });
  });
});

function createProtocolSchema(codexRepo: string): void {
  fs.mkdirSync(path.join(codexRepo, "codex-rs/app-server-protocol/schema/typescript"), {
    recursive: true,
  });
}
