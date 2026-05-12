import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveJoopoDocsPath,
  resolveJoopoReferencePaths,
  resolveJoopoSourcePath,
} from "./docs-path.js";

async function makePackageRoot(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.writeFile(path.join(root, "package.json"), '{"name":"joopo"}\n');
  return root;
}

async function writeDocsJson(root: string): Promise<void> {
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(path.join(root, "docs", "docs.json"), "{}\n");
}

describe("resolveJoopoDocsPath", () => {
  it("uses the workspace docs directory when it has canonical docs metadata", async () => {
    const root = await makePackageRoot("joopo-docs-workspace-");
    await writeDocsJson(root);

    await expect(resolveJoopoDocsPath({ workspaceDir: root })).resolves.toBe(
      path.join(root, "docs"),
    );
  });

  it("finds bundled package docs from a nested package path", async () => {
    const root = await makePackageRoot("joopo-docs-package-");
    await writeDocsJson(root);
    const nested = path.join(root, "dist", "agents");
    await fs.mkdir(nested, { recursive: true });

    await expect(resolveJoopoDocsPath({ cwd: nested })).resolves.toBe(path.join(root, "docs"));
  });

  it("does not accept incomplete template-only docs directories", async () => {
    const root = await makePackageRoot("joopo-docs-incomplete-");
    await fs.mkdir(path.join(root, "docs", "reference", "templates"), { recursive: true });

    await expect(resolveJoopoDocsPath({ cwd: root })).resolves.toBeNull();
  });
});

describe("resolveJoopoSourcePath", () => {
  it("returns the package root only for git checkouts", async () => {
    const root = await makePackageRoot("joopo-source-git-");
    await fs.mkdir(path.join(root, ".git"));

    await expect(resolveJoopoSourcePath({ cwd: root })).resolves.toBe(root);
  });

  it("omits source path for npm-style package installs", async () => {
    const root = await makePackageRoot("joopo-source-npm-");

    await expect(resolveJoopoSourcePath({ cwd: root })).resolves.toBeNull();
  });
});

describe("resolveJoopoReferencePaths", () => {
  it("returns docs and local source together for git checkouts", async () => {
    const root = await makePackageRoot("joopo-reference-git-");
    await writeDocsJson(root);
    await fs.mkdir(path.join(root, ".git"));

    await expect(resolveJoopoReferencePaths({ cwd: root })).resolves.toEqual({
      docsPath: path.join(root, "docs"),
      sourcePath: root,
    });
  });
});
