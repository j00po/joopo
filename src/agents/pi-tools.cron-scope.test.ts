import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyAgentTool } from "./tools/common.js";

const mocks = vi.hoisted(() => {
  const stubTool = (name: string, ownerOnly = false) =>
    ({
      name,
      label: name,
      displaySummary: name,
      description: name,
      ownerOnly,
      parameters: { type: "object", properties: {} },
      execute: vi.fn(),
    }) satisfies AnyAgentTool;

  return {
    createJoopoToolsOptions: vi.fn(),
    stubTool,
  };
});

vi.mock("./joopo-tools.js", () => ({
  createJoopoTools: (options: unknown) => {
    mocks.createJoopoToolsOptions(options);
    return [mocks.stubTool("cron", true)];
  },
}));

import "./test-helpers/fast-bash-tools.js";
import "./test-helpers/fast-coding-tools.js";
import { createJoopoCodingTools } from "./pi-tools.js";

describe("createJoopoCodingTools cron scope", () => {
  beforeEach(() => {
    mocks.createJoopoToolsOptions.mockClear();
  });

  it("scopes the cron owner-only runtime grant to self-removal", () => {
    const tools = createJoopoCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: false,
      ownerOnlyToolAllowlist: ["cron"],
    });

    expect(tools.map((tool) => tool.name)).toContain("cron");
    expect(mocks.createJoopoToolsOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        cronSelfRemoveOnlyJobId: "job-current",
      }),
    );
  });

  it("does not scope ordinary owner cron sessions", () => {
    createJoopoCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: true,
    });

    expect(mocks.createJoopoToolsOptions).toHaveBeenCalledWith(
      expect.not.objectContaining({
        cronSelfRemoveOnlyJobId: expect.any(String),
      }),
    );
  });
});
