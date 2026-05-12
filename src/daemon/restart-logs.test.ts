import { describe, expect, it } from "vitest";
import {
  GATEWAY_RESTART_LOG_FILENAME,
  renderCmdRestartLogSetup,
  renderPosixRestartLogSetup,
  resolveGatewayLogPaths,
  resolveGatewayRestartLogPath,
} from "./restart-logs.js";

describe("restart log conventions", () => {
  it("resolves profile-aware gateway logs and restart attempts together", () => {
    const env = {
      HOME: "/Users/test",
      JOOPO_PROFILE: "work",
    };

    expect(resolveGatewayLogPaths(env)).toEqual({
      logDir: "/Users/test/.joopo-work/logs",
      stdoutPath: "/Users/test/.joopo-work/logs/gateway.log",
      stderrPath: "/Users/test/.joopo-work/logs/gateway.err.log",
    });
    expect(resolveGatewayRestartLogPath(env)).toBe(
      `/Users/test/.joopo-work/logs/${GATEWAY_RESTART_LOG_FILENAME}`,
    );
  });

  it("honors JOOPO_STATE_DIR for restart attempts", () => {
    const env = {
      HOME: "/Users/test",
      JOOPO_STATE_DIR: "/tmp/joopo-state",
    };

    expect(resolveGatewayRestartLogPath(env)).toBe(
      `/tmp/joopo-state/logs/${GATEWAY_RESTART_LOG_FILENAME}`,
    );
  });

  it("renders best-effort POSIX log setup with escaped paths", () => {
    const setup = renderPosixRestartLogSetup({
      HOME: "/Users/test's",
    });

    expect(setup).toContain(
      "if mkdir -p '/Users/test'\\''s/.joopo/logs' 2>/dev/null && : >>'/Users/test'\\''s/.joopo/logs/gateway-restart.log' 2>/dev/null; then",
    );
    expect(setup).toContain("exec >>'/Users/test'\\''s/.joopo/logs/gateway-restart.log' 2>&1");
  });

  it("renders CMD log setup with quoted paths", () => {
    const setup = renderCmdRestartLogSetup({
      USERPROFILE: "C:\\Users\\Test User",
    });

    expect(setup.quotedLogPath).toBe('"C:\\Users\\Test User/.joopo/logs/gateway-restart.log"');
    expect(setup.lines).toContain(
      'if not exist "C:\\Users\\Test User/.joopo/logs" mkdir "C:\\Users\\Test User/.joopo/logs" >nul 2>&1',
    );
  });
});
