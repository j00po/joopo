import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendJsonl,
  buildRttResult,
  buildRunId,
  createHarnessEnv,
  extractRtt,
  readTelegramSummary,
  safeRunLabel,
  validateJoopoPackageSpec,
} from "../../scripts/lib/rtt-harness.ts";
import { __testing as cliTesting } from "../../scripts/rtt.ts";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(TEST_DIR, "../fixtures/telegram-qa-summary-rtt.json");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("RTT harness", () => {
  it("validates Joopo package specs", () => {
    expect(validateJoopoPackageSpec("joopo@main")).toBe("joopo@main");
    expect(validateJoopoPackageSpec("joopo@alpha")).toBe("joopo@alpha");
    expect(validateJoopoPackageSpec("joopo@beta")).toBe("joopo@beta");
    expect(validateJoopoPackageSpec("joopo@latest")).toBe("joopo@latest");
    expect(validateJoopoPackageSpec("joopo@2026.4.30")).toBe("joopo@2026.4.30");
    expect(validateJoopoPackageSpec("joopo@2026.4.30-beta.2")).toBe(
      "joopo@2026.4.30-beta.2",
    );
    expect(validateJoopoPackageSpec("joopo@2026.4.30-alpha.2")).toBe(
      "joopo@2026.4.30-alpha.2",
    );

    expect(() => validateJoopoPackageSpec("@joopo/joopo@beta")).toThrow(
      /Package spec must be/,
    );
    expect(() => validateJoopoPackageSpec("joopo@next")).toThrow(/Package spec must be/);
  });

  it("builds stable run labels", () => {
    expect(safeRunLabel("joopo@beta")).toBe("joopo_beta");
    expect(
      buildRunId({
        now: new Date("2026-05-01T03:04:05.678Z"),
        spec: "joopo@beta",
        index: 1,
      }),
    ).toBe("2026-05-01T030405678Z-joopo_beta-2");
  });

  it("constructs harness env without dropping caller env", () => {
    const env = createHarnessEnv({
      baseEnv: {
        JOOPO_QA_TELEGRAM_GROUP_ID: "-100123",
        JOOPO_NPM_TELEGRAM_FAST: "0",
      },
      providerMode: "mock-openai",
      rawOutputDir: ".artifacts/rtt/run/raw",
      samples: 20,
      sampleTimeoutMs: 30_000,
      scenarios: ["telegram-mentioned-message-reply"],
      spec: "joopo@beta",
      timeoutMs: 180_000,
      version: "2026.4.30-beta.1",
    });

    expect(env.JOOPO_QA_TELEGRAM_GROUP_ID).toBe("-100123");
    expect(env.JOOPO_NPM_TELEGRAM_PACKAGE_SPEC).toBe("joopo@beta");
    expect(env.JOOPO_NPM_TELEGRAM_PACKAGE_LABEL).toBe("joopo@beta (2026.4.30-beta.1)");
    expect(env.JOOPO_NPM_TELEGRAM_PROVIDER_MODE).toBe("mock-openai");
    expect(env.JOOPO_NPM_TELEGRAM_SCENARIOS).toBe("telegram-mentioned-message-reply");
    expect(env.JOOPO_NPM_TELEGRAM_OUTPUT_DIR).toBe(".artifacts/rtt/run/raw");
    expect(env.JOOPO_NPM_TELEGRAM_FAST).toBe("0");
    expect(env.JOOPO_NPM_TELEGRAM_WARM_SAMPLES).toBe("20");
    expect(env.JOOPO_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS).toBe("30000");
    expect(env.JOOPO_QA_TELEGRAM_CANARY_TIMEOUT_MS).toBe("180000");
    expect(env.JOOPO_QA_TELEGRAM_SCENARIO_TIMEOUT_MS).toBe("180000");
  });

  it("extracts RTT values from Telegram QA summaries", async () => {
    const summary = await readTelegramSummary(FIXTURE_PATH);
    expect(extractRtt(summary)).toEqual({
      canaryMs: 1234,
      mentionReplyMs: 5000,
      warmSamples: [4000, 5000, 7000],
      avgMs: 5333,
      p50Ms: 5000,
      p95Ms: 7000,
      maxMs: 7000,
      failedSamples: 0,
    });
  });

  it("builds normalized result JSON", async () => {
    const summary = await readTelegramSummary(FIXTURE_PATH);
    const result = buildRttResult({
      artifacts: {
        rawObservedMessagesPath: "runs/run/raw/telegram-qa-observed-messages.json",
        rawReportPath: "runs/run/raw/telegram-qa-report.md",
        rawSummaryPath: "runs/run/raw/telegram-qa-summary.json",
        resultPath: "runs/run/result.json",
      },
      finishedAt: new Date("2026-05-01T00:00:12.000Z"),
      providerMode: "mock-openai",
      rawSummary: summary,
      runId: "run",
      scenarios: ["telegram-mentioned-message-reply"],
      spec: "joopo@beta",
      startedAt: new Date("2026-05-01T00:00:00.000Z"),
      version: "2026.4.30-beta.1",
    });

    expect(result).toMatchObject({
      package: { spec: "joopo@beta", version: "2026.4.30-beta.1" },
      run: { durationMs: 12_000, id: "run", status: "pass" },
      mode: {
        providerMode: "mock-openai",
        scenarios: ["telegram-mentioned-message-reply"],
      },
      rtt: {
        canaryMs: 1234,
        mentionReplyMs: 5000,
        avgMs: 5333,
        p50Ms: 5000,
        p95Ms: 7000,
        maxMs: 7000,
        failedSamples: 0,
      },
    });
    expect(result.rtt.warmSamples).toEqual([4000, 5000, 7000]);
  });

  it("marks failed scenario summaries as failed results", () => {
    const result = buildRttResult({
      artifacts: {
        rawObservedMessagesPath: "runs/run/raw/telegram-qa-observed-messages.json",
        rawReportPath: "runs/run/raw/telegram-qa-report.md",
        rawSummaryPath: "runs/run/raw/telegram-qa-summary.json",
        resultPath: "runs/run/result.json",
      },
      finishedAt: new Date("2026-05-01T00:00:12.000Z"),
      providerMode: "mock-openai",
      rawSummary: {
        scenarios: [
          { id: "telegram-canary", rttMs: 5948, status: "pass" },
          { id: "telegram-mentioned-message-reply", status: "fail" },
        ],
      },
      runId: "run",
      scenarios: ["telegram-mentioned-message-reply"],
      spec: "joopo@latest",
      startedAt: new Date("2026-05-01T00:00:00.000Z"),
      version: "2026.4.29",
    });

    expect(result.run.status).toBe("fail");
    expect(result.rtt).toEqual({ canaryMs: 5948, mentionReplyMs: undefined });
  });

  it("appends JSONL rows", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "joopo-rtt-test-"));
    tempDirs.push(tempDir);
    const jsonlPath = path.join(tempDir, "data/rtt.jsonl");
    await appendJsonl(jsonlPath, { run: 1 });
    await appendJsonl(jsonlPath, { run: 2 });

    await expect(fs.readFile(jsonlPath, "utf8")).resolves.toBe('{"run":1}\n{"run":2}\n');
  });

  it("parses CLI options", () => {
    const parsed = cliTesting.parseArgs([
      "joopo@latest",
      "--package-tgz",
      "/tmp/joopo.tgz",
      "--provider",
      "live-frontier",
      "--runs",
      "3",
      "--samples",
      "5",
      "--sample-timeout-ms",
      "30000",
      "--timeout-ms",
      "240000",
      "--harness-root",
      "/tmp/joopo",
      "--output",
      "/tmp/runs",
    ]);

    expect(parsed.spec).toBe("joopo@latest");
    expect(parsed.options).toMatchObject({
      packageTgz: "/tmp/joopo.tgz",
      providerMode: "live-frontier",
      runs: 3,
      samples: 5,
      sampleTimeoutMs: 30_000,
      harnessRoot: "/tmp/joopo",
      output: "/tmp/runs",
      scenarios: ["telegram-mentioned-message-reply"],
      timeoutMs: 240_000,
    });
  });
});
