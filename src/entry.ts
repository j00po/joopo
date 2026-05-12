#!/usr/bin/env node
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isRootHelpInvocation, isRootVersionInvocation } from "./cli/argv.js";
import { assertNotRoot } from "./cli/root-guard.js";
import { parseCliContainerArgs, resolveCliContainerTarget } from "./cli/container-target.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
import { normalizeWindowsArgv } from "./cli/windows-argv.js";
import {
  enableJoopoCompileCache,
  resolveEntryInstallRoot,
  respawnWithoutJoopoCompileCacheIfNeeded,
} from "./entry.compile-cache.js";
import { buildCliRespawnPlan, runCliRespawnPlan } from "./entry.respawn.js";
import { tryHandleRootVersionFastPath } from "./entry.version-fast-path.js";
import { isTruthyEnvValue, normalizeEnv } from "./infra/env.js";
import { isMainModule } from "./infra/is-main.js";
import { ensureJoopoExecMarkerOnProcess } from "./infra/joopo-exec-env.js";
import { installProcessWarningFilter } from "./infra/warning-filter.js";

const ENTRY_WRAPPER_PAIRS = [
  { wrapperBasename: "joopo.mjs", entryBasename: "entry.js" },
  { wrapperBasename: "joopo.js", entryBasename: "entry.js" },
] as const;

function shouldForceReadOnlyAuthStore(argv: string[]): boolean {
  const tokens = argv.slice(2).filter((token) => token.length > 0 && !token.startsWith("-"));
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index] === "secrets" && tokens[index + 1] === "audit") {
      return true;
    }
  }
  return false;
}

function createGatewayEntryStartupTrace(argv: string[]) {
  const enabled =
    isTruthyEnvValue(process.env.JOOPO_GATEWAY_STARTUP_TRACE) &&
    argv.slice(2).includes("gateway");
  const started = performance.now();
  let last = started;
  const emit = (name: string, durationMs: number, totalMs: number) => {
    if (!enabled) {
      return;
    }
    process.stderr.write(
      `[gateway] startup trace: entry.${name} ${durationMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms\n`,
    );
  };
  return {
    mark(name: string) {
      const now = performance.now();
      emit(name, now - last, now - started);
      last = now;
    },
    async measure<T>(name: string, run: () => Promise<T>): Promise<T> {
      const before = performance.now();
      try {
        return await run();
      } finally {
        const now = performance.now();
        emit(name, now - before, now - started);
        last = now;
      }
    },
  };
}

const gatewayEntryStartupTrace = createGatewayEntryStartupTrace(process.argv);

// Guard: only run entry-point logic when this file is the main module.
// The bundler may import entry.js as a shared dependency when dist/index.js
// is the actual entry point; without this guard the top-level code below
// would call runCli a second time, starting a duplicate gateway that fails
// on the lock / port and crashes the process.
if (
  !isMainModule({
    currentFile: fileURLToPath(import.meta.url),
    wrapperEntryPairs: [...ENTRY_WRAPPER_PAIRS],
  })
) {
  // Imported as a dependency — skip all entry-point side effects.
} else {
  const entryFile = fileURLToPath(import.meta.url);
  const installRoot = resolveEntryInstallRoot(entryFile);
  const waitingForCompileCacheRespawn = respawnWithoutJoopoCompileCacheIfNeeded({
    currentFile: entryFile,
    installRoot,
  });
  if (!waitingForCompileCacheRespawn) {
    process.title = "joopo";
    ensureJoopoExecMarkerOnProcess();
    installProcessWarningFilter();
    normalizeEnv();

    // Block root execution early, before any state/config operations.
    // Allow --help and --version so users can still discover the override env var.
    if (!isRootHelpInvocation(process.argv) && !isRootVersionInvocation(process.argv)) {
      assertNotRoot();
    }

    enableJoopoCompileCache({
      installRoot,
    });
    gatewayEntryStartupTrace.mark("bootstrap");

    if (shouldForceReadOnlyAuthStore(process.argv)) {
      process.env.JOOPO_AUTH_STORE_READONLY = "1";
    }

    if (process.argv.includes("--no-color")) {
      process.env.NO_COLOR = "1";
      process.env.FORCE_COLOR = "0";
    }

    function ensureCliRespawnReady(): boolean {
      const plan = buildCliRespawnPlan();
      if (!plan) {
        return false;
      }

      runCliRespawnPlan(plan);
      // Parent must not continue running the CLI.
      return true;
    }

    process.argv = normalizeWindowsArgv(process.argv);

    if (!ensureCliRespawnReady()) {
      const parsedContainer = parseCliContainerArgs(process.argv);
      if (!parsedContainer.ok) {
        console.error(`[joopo] ${parsedContainer.error}`);
        process.exit(2);
      }

      const parsed = parseCliProfileArgs(parsedContainer.argv);
      if (!parsed.ok) {
        // Keep it simple; Commander will handle rich help/errors after we strip flags.
        console.error(`[joopo] ${parsed.error}`);
        process.exit(2);
      }

      const containerTargetName = resolveCliContainerTarget(process.argv);
      if (containerTargetName && parsed.profile) {
        console.error("[joopo] --container cannot be combined with --profile/--dev");
        process.exit(2);
      }

      if (parsed.profile) {
        applyCliProfileEnv({ profile: parsed.profile });
        // Keep Commander and ad-hoc argv checks consistent.
        process.argv = parsed.argv;
      }
      gatewayEntryStartupTrace.mark("argv");

      if (!tryHandleRootVersionFastPath(process.argv)) {
        await runMainOrRootHelp(process.argv);
      }
    }
  }
}

export async function tryHandleRootHelpFastPath(
  argv: string[],
  deps: {
    outputPrecomputedRootHelpText?: () => boolean;
    outputRootHelp?: () => void | Promise<void>;
    onError?: (error: unknown) => void;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<boolean> {
  if (resolveCliContainerTarget(argv, deps.env)) {
    return false;
  }
  if (!isRootHelpInvocation(argv)) {
    return false;
  }
  const handleError =
    deps.onError ??
    ((error: unknown) => {
      console.error(
        "[joopo] Failed to display help:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
  try {
    if (deps.outputRootHelp) {
      await deps.outputRootHelp();
      return true;
    }
    const outputPrecomputedRootHelpText =
      deps.outputPrecomputedRootHelpText ??
      (await import("./cli/root-help-metadata.js")).outputPrecomputedRootHelpText;
    if (!outputPrecomputedRootHelpText()) {
      const { outputRootHelp } = await import("./cli/program/root-help.js");
      await outputRootHelp();
    }
    return true;
  } catch (error) {
    handleError(error);
    return true;
  }
}

async function runMainOrRootHelp(argv: string[]): Promise<void> {
  if (await tryHandleRootHelpFastPath(argv)) {
    return;
  }
  try {
    const { runCli } = await gatewayEntryStartupTrace.measure(
      "run-main-import",
      () => import("./cli/run-main.js"),
    );
    await runCli(argv);
  } catch (error) {
    console.error(
      "[joopo] Failed to start CLI:",
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    process.exit(1);
  }
}
