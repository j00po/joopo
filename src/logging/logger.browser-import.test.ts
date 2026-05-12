import { importFreshModule } from "joopo/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredJoopoTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredJoopoTmpDir: ReturnType<typeof vi.fn>;
}> {
  const resolvePreferredJoopoTmpDir =
    params?.resolvePreferredJoopoTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredJoopoTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-joopo-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-joopo-dir.js")>(
      "../infra/tmp-joopo-dir.js",
    );
    return {
      ...actual,
      resolvePreferredJoopoTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await importFreshModule<LoggerModule>(
    import.meta.url,
    "./logger.js?scope=browser-safe",
  );
  return { module, resolvePreferredJoopoTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.doUnmock("../infra/tmp-joopo-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredJoopoTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredJoopoTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/joopo");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/joopo/joopo.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredJoopoTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toMatchObject({
      level: "silent",
      file: "/tmp/joopo/joopo.log",
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(module.getLogger().info("browser-safe")).toBeUndefined();
    expect(resolvePreferredJoopoTmpDir).not.toHaveBeenCalled();
  });
});
