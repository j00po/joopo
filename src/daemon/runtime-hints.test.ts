import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          JOOPO_STATE_DIR: "/tmp/joopo-state",
          JOOPO_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/joopo-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/joopo-state/logs/gateway.err.log",
      "Restart attempts: /tmp/joopo-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          JOOPO_STATE_DIR: "/tmp/joopo-state",
        },
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u joopo-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/joopo-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          JOOPO_STATE_DIR: "/tmp/joopo-state",
        },
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "Joopo Gateway" /V /FO LIST',
      "Restart attempts: /tmp/joopo-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "joopo gateway install",
        startCommand: "joopo gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.joopo.gateway.plist",
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      "joopo gateway install",
      "joopo gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.joopo.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "joopo gateway install",
        startCommand: "joopo gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.joopo.gateway.plist",
        systemdServiceName: "joopo-gateway",
        windowsTaskName: "Joopo Gateway",
      }),
    ).toEqual([
      "joopo gateway install",
      "joopo gateway",
      "systemctl --user start joopo-gateway.service",
    ]);
  });
});
