import { describe, expect, it } from "vitest";
import type { JoopoConfig } from "../config/config.js";
import { createJoopoTools } from "./joopo-tools.js";
import { isUpdatePlanToolEnabledForJoopoTools } from "./joopo-tools.registration.js";
import { isToolWrappedWithBeforeToolCallHook } from "./pi-tools.before-tool-call.js";
import { createUpdatePlanTool } from "./tools/update-plan-tool.js";

type UpdatePlanGatingParams = Parameters<typeof isUpdatePlanToolEnabledForJoopoTools>[0];

function expectUpdatePlanEnabled(params: UpdatePlanGatingParams, expected: boolean): void {
  expect(isUpdatePlanToolEnabledForJoopoTools(params)).toBe(expected);
}

function openAiGpt5Params(
  config: JoopoConfig,
  overrides: Partial<UpdatePlanGatingParams> = {},
): UpdatePlanGatingParams {
  const params: UpdatePlanGatingParams = {
    config,
    agentSessionKey: "agent:main:main",
    modelProvider: "openai",
    modelId: "gpt-5.4",
    ...overrides,
  };
  if ("agentId" in overrides && !("agentSessionKey" in overrides)) {
    delete params.agentSessionKey;
  }
  return params;
}

describe("joopo-tools update_plan gating", () => {
  it("keeps update_plan disabled by default", () => {
    expectUpdatePlanEnabled({ config: {} as JoopoConfig }, false);
  });

  it("does not expose update_plan from default tool construction", () => {
    const defaultTools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
    const emptyAllowlistTools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      pluginToolAllowlist: [],
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    expect(defaultTools.some((tool) => tool.name === "update_plan")).toBe(false);
    expect(emptyAllowlistTools.some((tool) => tool.name === "update_plan")).toBe(false);
  });

  it("wraps constructed tools with before-tool-call hooks by default", () => {
    const tools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
    });
    const unwrappedTools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      wrapBeforeToolCallHook: false,
    });

    expect(
      isToolWrappedWithBeforeToolCallHook(tools.find((tool) => tool.name === "sessions_list")!),
    ).toBe(true);
    expect(
      isToolWrappedWithBeforeToolCallHook(
        unwrappedTools.find((tool) => tool.name === "sessions_list")!,
      ),
    ).toBe(false);
  });

  it("registers update_plan when explicitly enabled", () => {
    const config = {
      tools: {
        experimental: {
          planTool: true,
        },
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled({ config }, true);
    expect(createUpdatePlanTool().displaySummary).toBe("Track a short structured work plan.");
  });

  it("registers update_plan when the runtime allowlist explicitly requests it", () => {
    const tools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      pluginToolAllowlist: ["update_plan"],
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    expect(tools.some((tool) => tool.name === "update_plan")).toBe(true);
  });

  it("registers update_plan when a config allowlist group includes it", () => {
    const tools = createJoopoTools({
      config: { tools: { allow: ["group:agents"] } } as JoopoConfig,
      disablePluginTools: true,
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    expect(tools.some((tool) => tool.name === "update_plan")).toBe(true);
  });

  it("registers update_plan when a runtime allowlist group includes it", () => {
    const tools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      pluginToolAllowlist: ["group:agents"],
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    expect(tools.some((tool) => tool.name === "update_plan")).toBe(true);
  });

  it("respects deny policy while constructing update_plan for grouped allowlists", () => {
    const tools = createJoopoTools({
      config: {} as JoopoConfig,
      disablePluginTools: true,
      pluginToolAllowlist: ["group:agents"],
      pluginToolDenylist: ["update_plan"],
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    expect(tools.some((tool) => tool.name === "update_plan")).toBe(false);
  });

  it("auto-enables update_plan for unconfigured GPT-5 openai runs", () => {
    // Criterion 1 of the GPT-5.4 parity gate ("no stalls after planning") is
    // universal, not opt-in. Unspecified executionContract on a supported
    // provider/model auto-activates strict-agentic so unconfigured installs
    // get the same behavior as explicit opt-in. Explicit "default" still
    // opts out (see "respects explicit default contract opt-out" below).
    const cfg = {
      agents: {
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg), true);
    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { modelProvider: "openai-codex" }), true);
  });

  it("respects explicit default contract opt-out on GPT-5 runs", () => {
    // Users who explicitly set executionContract: "default" are saying they
    // want the old pre-parity-program behavior. Honor that opt-out.
    const cfg = {
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "default",
          },
        },
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg), false);
  });

  it("does not auto-enable update_plan for non-openai providers even when unconfigured", () => {
    const cfg = {
      agents: {
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(
      openAiGpt5Params(cfg, { modelProvider: "anthropic", modelId: "claude-sonnet-4-6" }),
      false,
    );
    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { modelId: "gpt-4.1" }), false);
  });

  it("auto-enables update_plan for strict-agentic GPT-5 agents", () => {
    const cfg = {
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "strict-agentic",
          },
        },
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg), true);
  });

  it("does not auto-enable update_plan for unsupported providers or models", () => {
    const cfg = {
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "strict-agentic",
          },
        },
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(
      openAiGpt5Params(cfg, { modelProvider: "anthropic", modelId: "claude-sonnet-4-6" }),
      false,
    );
    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { modelId: "gpt-4.1" }), false);
  });

  it("lets explicit planTool false override strict-agentic auto-enable", () => {
    const cfg = {
      tools: {
        experimental: {
          planTool: false,
        },
      },
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "strict-agentic",
          },
        },
        list: [{ id: "main" }],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg), false);
  });

  it("resolves strict-agentic gating from explicit agentId when no session key is available", () => {
    const cfg = {
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "default",
          },
        },
        list: [
          { id: "main" },
          {
            id: "research",
            embeddedPi: {
              executionContract: "strict-agentic",
            },
          },
        ],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { agentId: "research" }), true);
  });

  it("applies per-agent overrides without leaking the contract to other agents", () => {
    const cfg = {
      agents: {
        defaults: {
          embeddedPi: {
            executionContract: "strict-agentic",
          },
        },
        list: [
          {
            id: "main",
            embeddedPi: {
              executionContract: "default",
            },
          },
          {
            id: "research",
          },
        ],
      },
    } as JoopoConfig;

    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { agentId: "main" }), false);
    expectUpdatePlanEnabled(openAiGpt5Params(cfg, { agentId: "research" }), true);
  });
});
