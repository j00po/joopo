import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseArgs,
  readArtifactPackageCandidateMetadata,
  validateJoopoPackageSpec,
} from "../../scripts/resolve-joopo-package-candidate.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolve-joopo-package-candidate", () => {
  it("accepts only Joopo release package specs for npm candidates", () => {
    expect(() => validateJoopoPackageSpec("joopo@beta")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@alpha")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@latest")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@2026.4.27")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@2026.4.27-1")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@2026.4.27-beta.2")).not.toThrow();
    expect(() => validateJoopoPackageSpec("joopo@2026.4.27-alpha.2")).not.toThrow();

    expect(() => validateJoopoPackageSpec("@evil/joopo@1.0.0")).toThrow(
      "package_spec must be joopo@alpha",
    );
    expect(() => validateJoopoPackageSpec("joopo@canary")).toThrow(
      "package_spec must be joopo@alpha",
    );
    expect(() => validateJoopoPackageSpec("joopo@2026.04.27")).toThrow(
      "package_spec must be joopo@alpha",
    );
    expect(() => validateJoopoPackageSpec("joopo@npm:other-package")).toThrow(
      "package_spec must be joopo@alpha",
    );
    expect(() => validateJoopoPackageSpec("joopo@file:../other-package.tgz")).toThrow(
      "package_spec must be joopo@alpha",
    );
  });

  it("parses optional empty workflow inputs without rejecting the command line", () => {
    expect(
      parseArgs([
        "--source",
        "npm",
        "--package-ref",
        "release/2026.4.27",
        "--package-spec",
        "joopo@beta",
        "--package-url",
        "",
        "--package-sha256",
        "",
        "--artifact-dir",
        ".",
        "--output-dir",
        ".artifacts/docker-e2e-package",
      ]),
    ).toMatchObject({
      artifactDir: ".",
      outputDir: ".artifacts/docker-e2e-package",
      packageSha256: "",
      packageRef: "release/2026.4.27",
      packageSpec: "joopo@beta",
      packageUrl: "",
      source: "npm",
    });
  });

  it("reads package source metadata from package artifacts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "joopo-package-candidate-"));
    tempDirs.push(dir);
    await writeFile(
      path.join(dir, "package-candidate.json"),
      JSON.stringify(
        {
          packageRef: "release/2026.4.30",
          packageSourceSha: "66ce632b9b7c5c7fdd3e66c739687d51638ad6e2",
          packageTrustedReason: "repository-branch-history",
          sha256: "a".repeat(64),
        },
        null,
        2,
      ),
    );

    await expect(readArtifactPackageCandidateMetadata(dir)).resolves.toMatchObject({
      packageRef: "release/2026.4.30",
      packageSourceSha: "66ce632b9b7c5c7fdd3e66c739687d51638ad6e2",
      packageTrustedReason: "repository-branch-history",
      sha256: "a".repeat(64),
    });
  });
});
