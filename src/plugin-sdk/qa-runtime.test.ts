import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupTempDirs,
  expectPrivateQaLabRuntimeSurfaceLoad,
  expectQaLabRuntimeSurfaceLoad,
  restorePrivateQaCliEnv,
} from "./qa-runtime.test-helpers.js";

const loadBundledPluginPublicSurfaceModuleSync = vi.hoisted(() => vi.fn());
const resolveJoopoPackageRootSync = vi.hoisted(() => vi.fn());

vi.mock("./facade-runtime.js", () => ({
  loadBundledPluginPublicSurfaceModuleSync,
}));

vi.mock("../infra/joopo-root.js", () => ({
  resolveJoopoPackageRootSync,
}));

describe("plugin-sdk qa-runtime", () => {
  const tempDirs: string[] = [];
  const originalPrivateQaCli = process.env.JOOPO_ENABLE_PRIVATE_QA_CLI;

  beforeEach(() => {
    loadBundledPluginPublicSurfaceModuleSync.mockReset();
    resolveJoopoPackageRootSync.mockReset().mockReturnValue(null);
    delete process.env.JOOPO_ENABLE_PRIVATE_QA_CLI;
  });

  afterEach(() => {
    cleanupTempDirs(tempDirs);
    restorePrivateQaCliEnv(originalPrivateQaCli);
  });

  it("stays cold until the runtime seam is used", async () => {
    const module = await import("./qa-runtime.js");

    expect(loadBundledPluginPublicSurfaceModuleSync).not.toHaveBeenCalled();
    expect(module).toEqual(
      expect.objectContaining({
        loadQaRuntimeModule: expect.any(Function),
        isQaRuntimeAvailable: expect.any(Function),
      }),
    );
  });

  it("loads the qa-lab runtime public surface through the generic seam", async () => {
    await expectQaLabRuntimeSurfaceLoad({
      importRuntime: () => import("./qa-runtime.js"),
      loadBundledPluginPublicSurfaceModuleSync,
    });
  });

  it("uses the source bundled tree for qa-lab runtime loading in private qa mode", async () => {
    await expectPrivateQaLabRuntimeSurfaceLoad({
      tempDirs,
      importRuntime: () => import("./qa-runtime.js"),
      loadBundledPluginPublicSurfaceModuleSync,
      resolveJoopoPackageRootSync,
    });
  });

  it("reports the runtime as unavailable when the qa-lab surface is missing", async () => {
    loadBundledPluginPublicSurfaceModuleSync.mockImplementation(() => {
      throw new Error("Unable to resolve bundled plugin public surface qa-lab/runtime-api.js");
    });

    const module = await import("./qa-runtime.js");

    expect(module.isQaRuntimeAvailable()).toBe(false);
  });
});
