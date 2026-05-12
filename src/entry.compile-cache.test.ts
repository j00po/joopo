import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupTempDirs, makeTempDir } from "../test/helpers/temp-dir.js";
import {
  buildJoopoCompileCacheRespawnPlan,
  isSourceCheckoutInstallRoot,
  resolveJoopoCompileCacheDirectory,
  resolveEntryInstallRoot,
  runJoopoCompileCacheRespawnPlan,
  shouldEnableJoopoCompileCache,
} from "./entry.compile-cache.js";

describe("entry compile cache", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  it("resolves install roots from source and dist entry paths", () => {
    expect(resolveEntryInstallRoot("/repo/joopo/src/entry.ts")).toBe("/repo/joopo");
    expect(resolveEntryInstallRoot("/repo/joopo/dist/entry.js")).toBe("/repo/joopo");
    expect(resolveEntryInstallRoot("/pkg/joopo/entry.js")).toBe("/pkg/joopo");
  });

  it("treats git and source entry markers as source checkouts", async () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-source-");
    await fs.writeFile(path.join(root, ".git"), "gitdir: .git/worktrees/joopo\n", "utf8");

    expect(isSourceCheckoutInstallRoot(root)).toBe(true);
  });

  it("disables compile cache for source-checkout installs", async () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-src-entry-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    expect(
      shouldEnableJoopoCompileCache({
        env: {},
        installRoot: root,
      }),
    ).toBe(false);
  });

  it("keeps compile cache enabled for packaged installs unless disabled by env", () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-package-");

    expect(shouldEnableJoopoCompileCache({ env: {}, installRoot: root })).toBe(true);
    expect(
      shouldEnableJoopoCompileCache({
        env: { NODE_DISABLE_COMPILE_CACHE: "1" },
        installRoot: root,
      }),
    ).toBe(false);
  });

  it("scopes packaged compile cache by package install metadata", async () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-package-key-");
    const packageJsonPath = path.join(root, "package.json");
    await fs.writeFile(packageJsonPath, '{"version":"2026.4.29"}\n', "utf8");

    const directory = resolveJoopoCompileCacheDirectory({
      env: { NODE_COMPILE_CACHE: path.join(root, ".node-cache") },
      installRoot: root,
    });

    expect(directory).toContain(path.join(".node-cache", "joopo"));
    expect(directory).toContain("2026.4.29");
    expect(path.basename(directory)).toMatch(/^\d+-\d+$/);
  });

  it("builds a one-shot no-cache respawn plan when source checkout inherits NODE_COMPILE_CACHE", async () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-respawn-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    const plan = buildJoopoCompileCacheRespawnPlan({
      currentFile: path.join(root, "dist", "entry.js"),
      env: { NODE_COMPILE_CACHE: "/tmp/joopo-cache" },
      execArgv: ["--no-warnings"],
      execPath: "/usr/bin/node",
      installRoot: root,
      argv: ["/usr/bin/node", path.join(root, "dist", "entry.js"), "status", "--json"],
    });

    expect(plan).toEqual({
      command: "/usr/bin/node",
      args: ["--no-warnings", path.join(root, "dist", "entry.js"), "status", "--json"],
      env: {
        NODE_DISABLE_COMPILE_CACHE: "1",
        JOOPO_SOURCE_COMPILE_CACHE_RESPAWNED: "1",
      },
    });
  });

  it("does not respawn packaged installs when NODE_COMPILE_CACHE is configured", () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-package-respawn-");

    expect(
      buildJoopoCompileCacheRespawnPlan({
        currentFile: path.join(root, "dist", "entry.js"),
        env: { NODE_COMPILE_CACHE: "/tmp/joopo-cache" },
        installRoot: root,
      }),
    ).toBeUndefined();
  });

  it("does not respawn source checkouts twice", async () => {
    const root = makeTempDir(tempDirs, "joopo-compile-cache-respawn-once-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    expect(
      buildJoopoCompileCacheRespawnPlan({
        currentFile: path.join(root, "dist", "entry.js"),
        env: {
          NODE_COMPILE_CACHE: "/tmp/joopo-cache",
          JOOPO_SOURCE_COMPILE_CACHE_RESPAWNED: "1",
        },
        installRoot: root,
      }),
    ).toBeUndefined();
  });

  it("runs compile-cache respawn plans with the child-process bridge", () => {
    const child = new EventEmitter() as ChildProcess;
    const spawn = vi.fn(() => child);
    const attachChildProcessBridge = vi.fn();
    const exit = vi.fn();
    const writeError = vi.fn();

    runJoopoCompileCacheRespawnPlan(
      {
        command: "/usr/bin/node",
        args: ["/repo/joopo/dist/entry.js", "status"],
        env: { NODE_DISABLE_COMPILE_CACHE: "1" },
      },
      {
        spawn: spawn as unknown as typeof import("node:child_process").spawn,
        attachChildProcessBridge,
        exit: exit as unknown as (code?: number) => never,
        writeError,
      },
    );

    expect(spawn).toHaveBeenCalledWith(
      "/usr/bin/node",
      ["/repo/joopo/dist/entry.js", "status"],
      {
        stdio: "inherit",
        env: { NODE_DISABLE_COMPILE_CACHE: "1" },
      },
    );
    expect(attachChildProcessBridge).toHaveBeenCalledWith(child, {
      onSignal: expect.any(Function),
    });

    child.emit("exit", 0, null);

    expect(exit).toHaveBeenCalledWith(0);
    expect(writeError).not.toHaveBeenCalled();
  });

  it("marks signal-terminated compile-cache respawn children as failed without forcing another exit", () => {
    const child = new EventEmitter() as ChildProcess;
    const spawn = vi.fn(() => child);
    const exit = vi.fn();

    runJoopoCompileCacheRespawnPlan(
      {
        command: "/usr/bin/node",
        args: ["/repo/joopo/dist/entry.js"],
        env: {},
      },
      {
        spawn: spawn as unknown as typeof import("node:child_process").spawn,
        attachChildProcessBridge: vi.fn(),
        exit: exit as unknown as (code?: number) => never,
        writeError: vi.fn(),
      },
    );

    child.emit("exit", null, "SIGTERM");

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("terminates before force-killing a signaled compile-cache respawn child", () => {
    vi.useFakeTimers();
    const child = new EventEmitter() as ChildProcess;
    const kill = vi.fn<(signal?: NodeJS.Signals) => boolean>(() => true);
    child.kill = kill as ChildProcess["kill"];
    const spawn = vi.fn(() => child);
    const exit = vi.fn();
    let onSignal: ((signal: NodeJS.Signals) => void) | undefined;

    try {
      runJoopoCompileCacheRespawnPlan(
        {
          command: "/usr/bin/node",
          args: ["/repo/joopo/dist/entry.js"],
          env: {},
        },
        {
          spawn: spawn as unknown as typeof import("node:child_process").spawn,
          attachChildProcessBridge: vi.fn((_child, options) => {
            onSignal = options?.onSignal;
            return { detach: vi.fn() };
          }),
          exit: exit as unknown as (code?: number) => never,
          writeError: vi.fn(),
        },
      );

      onSignal?.("SIGTERM");
      vi.advanceTimersByTime(1_000);

      expect(kill).toHaveBeenCalledWith("SIGTERM");
      expect(exit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1_000);

      expect(kill).toHaveBeenCalledWith(process.platform === "win32" ? "SIGTERM" : "SIGKILL");
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
