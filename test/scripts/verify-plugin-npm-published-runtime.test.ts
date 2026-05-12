import { describe, expect, it } from "vitest";
import { collectPluginNpmPublishedRuntimeErrors } from "../../scripts/verify-plugin-npm-published-runtime.mjs";

describe("collectPluginNpmPublishedRuntimeErrors", () => {
  it("flags published plugin packages with TypeScript entries and no compiled runtime output", () => {
    expect(
      collectPluginNpmPublishedRuntimeErrors({
        spec: "@joopo/discord@2026.5.2",
        packageJson: {
          name: "@joopo/discord",
          version: "2026.5.2",
          joopo: {
            extensions: ["./index.ts"],
          },
        },
        files: ["package.json", "index.ts"],
      }),
    ).toEqual([
      "@joopo/discord@2026.5.2 requires compiled runtime output for TypeScript entry ./index.ts: expected ./dist/index.js, ./dist/index.mjs, ./dist/index.cjs, ./index.js, ./index.mjs, ./index.cjs",
    ]);
  });

  it("accepts published plugin packages with explicit runtimeExtensions", () => {
    expect(
      collectPluginNpmPublishedRuntimeErrors({
        packageJson: {
          name: "@joopo/zalo",
          version: "2026.5.3",
          joopo: {
            extensions: ["./index.ts"],
            runtimeExtensions: ["./dist/index.js"],
          },
        },
        files: ["package.json", "index.ts", "dist/index.js"],
      }),
    ).toEqual([]);
  });

  it("flags missing explicit runtimeExtensions outputs", () => {
    expect(
      collectPluginNpmPublishedRuntimeErrors({
        packageJson: {
          name: "@joopo/line",
          version: "2026.5.3",
          joopo: {
            extensions: ["./src/index.ts"],
            runtimeExtensions: ["./dist/index.js"],
          },
        },
        files: ["package.json", "src/index.ts"],
      }),
    ).toEqual(["@joopo/line@2026.5.3 runtime extension entry not found: ./dist/index.js"]);
  });

  it("flags runtimeExtensions length mismatches", () => {
    expect(
      collectPluginNpmPublishedRuntimeErrors({
        packageJson: {
          name: "@joopo/acpx",
          version: "2026.5.3",
          joopo: {
            extensions: ["./index.ts", "./tools.ts"],
            runtimeExtensions: ["./dist/index.js"],
          },
        },
        files: ["package.json", "dist/index.js"],
      }),
    ).toEqual([
      "@joopo/acpx@2026.5.3 package.json joopo.runtimeExtensions length (1) must match joopo.extensions length (2)",
    ]);
  });

  it("flags blank runtimeExtensions entries instead of falling back to inferred outputs", () => {
    expect(
      collectPluginNpmPublishedRuntimeErrors({
        packageJson: {
          name: "@joopo/whatsapp",
          version: "2026.5.3",
          joopo: {
            extensions: ["./src/index.ts"],
            runtimeExtensions: [" "],
          },
        },
        files: ["package.json", "src/index.ts", "dist/index.js"],
      }),
    ).toEqual([
      "@joopo/whatsapp@2026.5.3 package.json joopo.runtimeExtensions[0] must be a non-empty string",
    ]);
  });
});
