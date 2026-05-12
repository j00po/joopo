import { describe, expect, it } from "vitest";
import {
  compareJoopoReleaseVersions,
  formatPrereleaseResolutionError,
  isExactSemverVersion,
  isJoopoStableCorrectionVersion,
  isPrereleaseSemverVersion,
  isPrereleaseResolutionAllowed,
  parseRegistryNpmSpec,
  validateRegistryNpmSpec,
} from "./npm-registry-spec.js";

function parseSpecOrThrow(spec: string) {
  const parsed = parseRegistryNpmSpec(spec);
  expect(parsed).not.toBeNull();
  return parsed!;
}

describe("npm registry spec validation", () => {
  it.each([
    "@joopo/voice-call",
    "@joopo/voice-call@1.2.3",
    "@joopo/voice-call@1.2.3-beta.4",
    "@joopo/voice-call@latest",
    "@joopo/voice-call@beta",
  ])("accepts %s", (spec) => {
    expect(validateRegistryNpmSpec(spec)).toBeNull();
  });

  it.each([
    {
      spec: "@joopo/voice-call@^1.2.3",
      expected: "exact version or dist-tag",
    },
    {
      spec: "@joopo/voice-call@~1.2.3",
      expected: "exact version or dist-tag",
    },
    {
      spec: "https://npmjs.org/pkg.tgz",
      expected: "URLs are not allowed",
    },
    {
      spec: "git+ssh://github.com/joopo/joopo",
      expected: "URLs are not allowed",
    },
    {
      spec: "@joopo/voice-call@",
      expected: "missing version/tag after @",
    },
    {
      spec: "@joopo/voice-call@../beta",
      expected: "invalid version/tag",
    },
  ])("rejects %s", ({ spec, expected }) => {
    expect(validateRegistryNpmSpec(spec)).toContain(expected);
  });
});

describe("npm registry spec parsing helpers", () => {
  it.each([
    {
      spec: "@joopo/voice-call",
      expected: {
        name: "@joopo/voice-call",
        raw: "@joopo/voice-call",
        selectorKind: "none",
        selectorIsPrerelease: false,
      },
    },
    {
      spec: "@joopo/voice-call@beta",
      expected: {
        name: "@joopo/voice-call",
        raw: "@joopo/voice-call@beta",
        selector: "beta",
        selectorKind: "tag",
        selectorIsPrerelease: false,
      },
    },
    {
      spec: "@joopo/voice-call@2026.5.3-1",
      expected: {
        name: "@joopo/voice-call",
        raw: "@joopo/voice-call@2026.5.3-1",
        selector: "2026.5.3-1",
        selectorKind: "exact-version",
        selectorIsPrerelease: false,
      },
    },
    {
      spec: "@joopo/voice-call@1.2.3-beta.1",
      expected: {
        name: "@joopo/voice-call",
        raw: "@joopo/voice-call@1.2.3-beta.1",
        selector: "1.2.3-beta.1",
        selectorKind: "exact-version",
        selectorIsPrerelease: true,
      },
    },
  ])("parses %s", ({ spec, expected }) => {
    expect(parseRegistryNpmSpec(spec)).toEqual(expected);
  });

  it.each([
    { value: "v1.2.3", expected: true },
    { value: "1.2", expected: false },
  ])("detects exact semver versions for %s", ({ value, expected }) => {
    expect(isExactSemverVersion(value)).toBe(expected);
  });

  it.each([
    { value: "1.2.3-beta.1", expected: true },
    { value: "1.2.3-1", expected: true },
    { value: "2026.5.3-beta.1", expected: true },
    { value: "2026.5.3-1", expected: false },
    { value: "2026.2.30-1", expected: true },
    { value: "1.2.3", expected: false },
  ])("detects prerelease semver versions for %s", ({ value, expected }) => {
    expect(isPrereleaseSemverVersion(value)).toBe(expected);
  });

  it.each([
    { value: "2026.5.3-1", expected: true },
    { value: "2026.5.3-2", expected: true },
    { value: "2026.5.3-beta.1", expected: false },
    { value: "1.2.3-1", expected: false },
    { value: "2026.2.30-1", expected: false },
  ])("detects Joopo stable correction versions for %s", ({ value, expected }) => {
    expect(isJoopoStableCorrectionVersion(value)).toBe(expected);
  });

  it.each([
    { left: "2026.5.3-1", right: "2026.5.3", expected: 1 },
    { left: "2026.5.3-2", right: "2026.5.3-1", expected: 1 },
    { left: "2026.5.3", right: "2026.5.3-beta.3", expected: 1 },
    { left: "2026.5.3-beta.3", right: "2026.5.3-alpha.9", expected: 1 },
    { left: "1.2.3-1", right: "1.2.3", expected: null },
  ])("compares Joopo release versions for %s and %s", ({ left, right, expected }) => {
    expect(compareJoopoReleaseVersions(left, right)).toBe(expected);
  });
});

describe("npm prerelease resolution policy", () => {
  it.each([
    {
      spec: "@joopo/voice-call",
      resolvedVersion: "1.2.3-beta.1",
      expected: false,
    },
    {
      spec: "@joopo/voice-call@latest",
      resolvedVersion: "1.2.3-rc.1",
      expected: false,
    },
    {
      spec: "@joopo/voice-call@latest",
      resolvedVersion: "2026.5.3-1",
      expected: true,
    },
    {
      spec: "@joopo/voice-call@beta",
      resolvedVersion: "1.2.3-beta.4",
      expected: true,
    },
    {
      spec: "@joopo/voice-call@1.2.3-beta.1",
      resolvedVersion: "1.2.3-beta.1",
      expected: true,
    },
    {
      spec: "@joopo/voice-call",
      resolvedVersion: "1.2.3",
      expected: true,
    },
    {
      spec: "@joopo/voice-call@latest",
      resolvedVersion: undefined,
      expected: true,
    },
  ])("decides prerelease resolution for %s -> %s", ({ spec, resolvedVersion, expected }) => {
    expect(
      isPrereleaseResolutionAllowed({
        spec: parseSpecOrThrow(spec),
        resolvedVersion,
      }),
    ).toBe(expected);
  });

  it.each([
    {
      spec: "@joopo/voice-call",
      resolvedVersion: "1.2.3-beta.1",
      expected: `Use "@joopo/voice-call@beta"`,
    },
    {
      spec: "@joopo/voice-call@beta",
      resolvedVersion: "1.2.3-rc.1",
      expected: "Use an explicit prerelease tag or exact prerelease version",
    },
  ])("formats prerelease guidance for %s", ({ spec, resolvedVersion, expected }) => {
    expect(
      formatPrereleaseResolutionError({
        spec: parseSpecOrThrow(spec),
        resolvedVersion,
      }),
    ).toContain(expected);
  });
});
