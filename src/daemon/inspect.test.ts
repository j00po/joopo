import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectMarkerLineWithGateway, findExtraGatewayServices } from "./inspect.js";

const { execSchtasksMock } = vi.hoisted(() => ({
  execSchtasksMock: vi.fn(),
}));

vi.mock("./schtasks-exec.js", () => ({
  execSchtasks: (...args: unknown[]) => execSchtasksMock(...args),
}));

// Real content from the joopo-gateway.service unit file (the canonical gateway unit).
const GATEWAY_SERVICE_CONTENTS = `\
[Unit]
Description=Joopo Gateway (v2026.3.8)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/bin/node /home/joopo/.npm-global/lib/node_modules/joopo/dist/entry.js gateway --port 18789
Restart=always
Environment=JOOPO_SERVICE_MARKER=joopo
Environment=JOOPO_SERVICE_KIND=gateway
Environment=JOOPO_SERVICE_VERSION=2026.3.8

[Install]
WantedBy=default.target
`;

// Real content from the joopo-test.service unit file (a non-gateway joopo service).
const TEST_SERVICE_CONTENTS = `\
[Unit]
Description=Joopo test service
After=default.target

[Service]
Type=simple
ExecStart=/bin/sh -c 'while true; do sleep 60; done'
Restart=on-failure

[Install]
WantedBy=default.target
`;

const JOOPOBOT_GATEWAY_CONTENTS = `\
[Unit]
Description=Joopobot Gateway
[Service]
ExecStart=/usr/bin/node /opt/joopobot/dist/entry.js gateway --port 18789
Environment=HOME=/home/joopobot
`;

const COMPANION_SERVICE_CONTENTS = `\
[Unit]
Description=Joopo companion worker
After=joopo-gateway.service
Requires=joopo-gateway.service

[Service]
ExecStart=/usr/bin/node /opt/joopo-worker/dist/index.js worker
`;

const CUSTOM_JOOPO_GATEWAY_CONTENTS = `\
[Unit]
Description=Custom Joopo gateway

[Service]
ExecStart=/usr/bin/node /opt/joopo/dist/entry.js gateway --port 18888
`;

describe("detectMarkerLineWithGateway", () => {
  it("returns null for joopo-test.service (joopo only in description, no gateway on same line)", () => {
    expect(detectMarkerLineWithGateway(TEST_SERVICE_CONTENTS)).toBeNull();
  });

  it("returns joopo for the canonical gateway unit (ExecStart has both joopo and gateway)", () => {
    expect(detectMarkerLineWithGateway(GATEWAY_SERVICE_CONTENTS)).toBe("joopo");
  });

  it("returns joopobot for a joopobot gateway unit", () => {
    expect(detectMarkerLineWithGateway(JOOPOBOT_GATEWAY_CONTENTS)).toBe("joopobot");
  });

  it("handles line continuations — marker and gateway split across physical lines", () => {
    const contents = `[Service]\nExecStart=/usr/bin/node /opt/joopo/dist/entry.js \\\n  gateway --port 18789\n`;
    expect(detectMarkerLineWithGateway(contents)).toBe("joopo");
  });

  it("ignores dependency-only references to the gateway unit", () => {
    expect(detectMarkerLineWithGateway(COMPANION_SERVICE_CONTENTS)).toBeNull();
  });

  it("ignores non-gateway ExecStart commands that only pass gateway-named options", () => {
    const contents = `[Service]\nExecStart=/usr/bin/joopo-helper --gateway-url http://127.0.0.1:18789 sync\n`;
    expect(detectMarkerLineWithGateway(contents)).toBeNull();
  });
});

describe("findExtraGatewayServices (linux / scanSystemdDir) — real filesystem", () => {
  // These tests write real .service files to a temp dir and call findExtraGatewayServices
  // with that dir as HOME. No platform mocking or fs mocking needed.
  // Only runs on Linux/macOS where the linux branch of findExtraGatewayServices is active.
  const isLinux = process.platform === "linux";

  it.skipIf(!isLinux)("does not report joopo-test.service as a gateway service", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
    const systemdDir = path.join(tmpHome, ".config", "systemd", "user");
    try {
      await fs.mkdir(systemdDir, { recursive: true });
      await fs.writeFile(path.join(systemdDir, "joopo-test.service"), TEST_SERVICE_CONTENTS);
      const result = await findExtraGatewayServices({ HOME: tmpHome });
      expect(result).toEqual([]);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it.skipIf(!isLinux)(
    "does not report the canonical joopo-gateway.service as an extra service",
    async () => {
      const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
      const systemdDir = path.join(tmpHome, ".config", "systemd", "user");
      try {
        await fs.mkdir(systemdDir, { recursive: true });
        await fs.writeFile(
          path.join(systemdDir, "joopo-gateway.service"),
          GATEWAY_SERVICE_CONTENTS,
        );
        const result = await findExtraGatewayServices({ HOME: tmpHome });
        expect(result).toEqual([]);
      } finally {
        await fs.rm(tmpHome, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!isLinux)(
    "reports a legacy joopobot-gateway service as an extra gateway service",
    async () => {
      const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
      const systemdDir = path.join(tmpHome, ".config", "systemd", "user");
      const unitPath = path.join(systemdDir, "joopobot-gateway.service");
      try {
        await fs.mkdir(systemdDir, { recursive: true });
        await fs.writeFile(unitPath, JOOPOBOT_GATEWAY_CONTENTS);
        const result = await findExtraGatewayServices({ HOME: tmpHome });
        expect(result).toEqual([
          {
            platform: "linux",
            label: "joopobot-gateway.service",
            detail: `unit: ${unitPath}`,
            scope: "user",
            marker: "joopobot",
            legacy: true,
          },
        ]);
      } finally {
        await fs.rm(tmpHome, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!isLinux)(
    "does not report companion units that only depend on the gateway",
    async () => {
      const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
      const systemdDir = path.join(tmpHome, ".config", "systemd", "user");
      try {
        await fs.mkdir(systemdDir, { recursive: true });
        await fs.writeFile(
          path.join(systemdDir, "joopo-companion.service"),
          COMPANION_SERVICE_CONTENTS,
        );
        const result = await findExtraGatewayServices({ HOME: tmpHome });
        expect(result).toEqual([]);
      } finally {
        await fs.rm(tmpHome, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!isLinux)("reports custom-named gateway units that execute joopo gateway", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
    const systemdDir = path.join(tmpHome, ".config", "systemd", "user");
    const unitPath = path.join(systemdDir, "custom-joopo.service");
    try {
      await fs.mkdir(systemdDir, { recursive: true });
      await fs.writeFile(unitPath, CUSTOM_JOOPO_GATEWAY_CONTENTS);
      const result = await findExtraGatewayServices({ HOME: tmpHome });
      expect(result).toEqual([
        {
          platform: "linux",
          label: "custom-joopo.service",
          detail: `unit: ${unitPath}`,
          scope: "user",
          marker: "joopo",
          legacy: false,
        },
      ]);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});

describe("findExtraGatewayServices (darwin / scanLaunchdDir) — real filesystem", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "darwin",
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("does not report LaunchAgent companions that only mention the gateway label", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
    const launchdDir = path.join(tmpHome, "Library", "LaunchAgents");
    try {
      await fs.mkdir(launchdDir, { recursive: true });
      await fs.writeFile(
        path.join(launchdDir, "com.example.companion.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>Label</key><string>com.example.companion</string>
<key>KeepAlive</key><dict><key>OtherJobEnabled</key><dict><key>ai.joopo.gateway</key><true/></dict></dict>
<key>ProgramArguments</key><array><string>/usr/local/bin/joopo-helper</string><string>sync</string></array>
</dict></plist>`,
      );
      const result = await findExtraGatewayServices({ HOME: tmpHome });
      expect(result).toEqual([]);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("does not report LaunchAgent companions that only pass gateway-named options", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
    const launchdDir = path.join(tmpHome, "Library", "LaunchAgents");
    try {
      await fs.mkdir(launchdDir, { recursive: true });
      await fs.writeFile(
        path.join(launchdDir, "com.example.companion-options.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>Label</key><string>com.example.companion-options</string>
<key>ProgramArguments</key><array><string>/usr/local/bin/joopo-helper</string><string>--gateway-url</string><string>http://127.0.0.1:18789</string><string>sync</string></array>
</dict></plist>`,
      );
      const result = await findExtraGatewayServices({ HOME: tmpHome });
      expect(result).toEqual([]);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("reports custom LaunchAgents that execute joopo gateway", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-test-"));
    const launchdDir = path.join(tmpHome, "Library", "LaunchAgents");
    const plistPath = path.join(launchdDir, "com.example.joopo-gateway.plist");
    try {
      await fs.mkdir(launchdDir, { recursive: true });
      await fs.writeFile(
        plistPath,
        `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>Label</key><string>com.example.joopo-gateway</string>
<key>ProgramArguments</key><array><string>/usr/local/bin/joopo</string><string>gateway</string><string>--port</string><string>18888</string></array>
</dict></plist>`,
      );
      const result = await findExtraGatewayServices({ HOME: tmpHome });
      expect(result).toEqual([
        {
          platform: "darwin",
          label: "com.example.joopo-gateway",
          detail: `plist: ${plistPath}`,
          scope: "user",
          marker: "joopo",
          legacy: false,
        },
      ]);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});

describe("findExtraGatewayServices (win32)", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });
    execSchtasksMock.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("skips schtasks queries unless deep mode is enabled", async () => {
    const result = await findExtraGatewayServices({});
    expect(result).toEqual([]);
    expect(execSchtasksMock).not.toHaveBeenCalled();
  });

  it("returns empty results when schtasks query fails", async () => {
    execSchtasksMock.mockResolvedValueOnce({
      code: 1,
      stdout: "",
      stderr: "error",
    });

    const result = await findExtraGatewayServices({}, { deep: true });
    expect(result).toEqual([]);
  });

  it("collects only non-joopo marker tasks from schtasks output", async () => {
    execSchtasksMock.mockResolvedValueOnce({
      code: 0,
      stdout: [
        "TaskName: Joopo Gateway",
        "Task To Run: C:\\Program Files\\Joopo\\joopo.exe gateway run",
        "",
        "TaskName: Joopobot Legacy",
        "Task To Run: C:\\joopobot\\joopobot.exe run",
        "",
        "TaskName: Other Task",
        "Task To Run: C:\\tools\\helper.exe",
        "",
      ].join("\n"),
      stderr: "",
    });

    const result = await findExtraGatewayServices({}, { deep: true });
    expect(result).toEqual([
      {
        platform: "win32",
        label: "Joopobot Legacy",
        detail: "task: Joopobot Legacy, run: C:\\joopobot\\joopobot.exe run",
        scope: "system",
        marker: "joopobot",
        legacy: true,
      },
    ]);
  });
});
