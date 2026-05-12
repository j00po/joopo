import { beforeAll, describe, expect, it, vi } from "vitest";

const resolveGatewayLogPathsMock = vi.fn(() => ({
  logDir: "C:\\tmp\\joopo-state\\logs",
  stdoutPath: "C:\\tmp\\joopo-state\\logs\\gateway.log",
  stderrPath: "C:\\tmp\\joopo-state\\logs\\gateway.err.log",
}));
const resolveGatewayRestartLogPathMock = vi.fn(
  () => "C:\\tmp\\joopo-state\\logs\\gateway-restart.log",
);

vi.mock("./restart-logs.js", () => ({
  resolveGatewayLogPaths: resolveGatewayLogPathsMock,
  resolveGatewayRestartLogPath: resolveGatewayRestartLogPathMock,
}));

let buildPlatformRuntimeLogHints: typeof import("./runtime-hints.js").buildPlatformRuntimeLogHints;

describe("buildPlatformRuntimeLogHints", () => {
  beforeAll(async () => {
    ({ buildPlatformRuntimeLogHints } = await import("./runtime-hints.js"));
  });

  it("strips windows drive prefixes from darwin display paths", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/joopo-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/joopo-state/logs/gateway.err.log",
      "Restart attempts: /tmp/joopo-state/logs/gateway-restart.log",
    ]);
  });
});
