import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withTempDir } from "./test-helpers/temp-dir.js";
import {
  ensureDir,
  resolveConfigDir,
  resolveHomeDir,
  resolveUserPath,
  shortenHomeInString,
  shortenHomePath,
  sleep,
} from "./utils.js";

describe("ensureDir", () => {
  it("creates nested directory", async () => {
    await withTempDir({ prefix: "joopo-test-" }, async (tmp) => {
      const target = path.join(tmp, "nested", "dir");
      await ensureDir(target);
      expect(fs.existsSync(target)).toBe(true);
    });
  });
});

describe("sleep", () => {
  it("resolves after delay using fake timers", async () => {
    vi.useFakeTimers();
    try {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resolveConfigDir", () => {
  it("prefers ~/.joopo when legacy dir is missing", async () => {
    await withTempDir({ prefix: "joopo-config-dir-" }, async (root) => {
      const newDir = path.join(root, ".joopo");
      await fs.promises.mkdir(newDir, { recursive: true });
      const resolved = resolveConfigDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    });
  });

  it("expands JOOPO_STATE_DIR using the provided env", () => {
    const env = {
      HOME: "/tmp/joopo-home",
      JOOPO_STATE_DIR: "~/state",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/joopo-home", "state"));
  });

  it("falls back to the config file directory when only JOOPO_CONFIG_PATH is set", () => {
    const env = {
      HOME: "/tmp/joopo-home",
      JOOPO_CONFIG_PATH: "~/profiles/dev/joopo.json",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/joopo-home", "profiles", "dev"));
  });
});

describe("resolveHomeDir", () => {
  it("prefers JOOPO_HOME over HOME", () => {
    vi.stubEnv("JOOPO_HOME", "/srv/joopo-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveHomeDir()).toBe(path.resolve("/srv/joopo-home"));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomePath", () => {
  it("uses $JOOPO_HOME prefix when JOOPO_HOME is set", () => {
    vi.stubEnv("JOOPO_HOME", "/srv/joopo-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(shortenHomePath(`${path.resolve("/srv/joopo-home")}/.joopo/joopo.json`)).toBe(
        "$JOOPO_HOME/.joopo/joopo.json",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomeInString", () => {
  it("uses $JOOPO_HOME replacement when JOOPO_HOME is set", () => {
    vi.stubEnv("JOOPO_HOME", "/srv/joopo-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(
        shortenHomeInString(
          `config: ${path.resolve("/srv/joopo-home")}/.joopo/joopo.json`,
        ),
      ).toBe("config: $JOOPO_HOME/.joopo/joopo.json");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("resolveUserPath", () => {
  it("expands ~ to home dir", () => {
    expect(resolveUserPath("~", {}, () => "/Users/thoffman")).toBe(path.resolve("/Users/thoffman"));
  });

  it("expands ~/ to home dir", () => {
    expect(resolveUserPath("~/joopo", {}, () => "/Users/thoffman")).toBe(
      path.resolve("/Users/thoffman", "joopo"),
    );
  });

  it("resolves relative paths", () => {
    expect(resolveUserPath("tmp/dir")).toBe(path.resolve("tmp/dir"));
  });

  it("prefers JOOPO_HOME for tilde expansion", () => {
    vi.stubEnv("JOOPO_HOME", "/srv/joopo-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveUserPath("~/joopo")).toBe(path.resolve("/srv/joopo-home", "joopo"));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the provided env for tilde expansion", () => {
    const env = {
      HOME: "/tmp/joopo-home",
      JOOPO_HOME: "/srv/joopo-home",
    } as NodeJS.ProcessEnv;

    expect(resolveUserPath("~/joopo", env)).toBe(path.resolve("/srv/joopo-home", "joopo"));
  });

  it("keeps blank paths blank", () => {
    expect(resolveUserPath("")).toBe("");
    expect(resolveUserPath("   ")).toBe("");
  });

  it("returns empty string for undefined/null input", () => {
    expect(resolveUserPath(undefined as unknown as string)).toBe("");
    expect(resolveUserPath(null as unknown as string)).toBe("");
  });
});
