import { describe, expect, it } from "vitest";
import { prepareCliBundleMcpConfig } from "./bundle-mcp.js";

describe("prepareCliBundleMcpConfig codex", () => {
  it("injects codex MCP config overrides with env-backed loopback headers", async () => {
    const prepared = await prepareCliBundleMcpConfig({
      enabled: true,
      mode: "codex-config-overrides",
      backend: {
        command: "codex",
        args: ["exec", "--json"],
        resumeArgs: ["exec", "resume", "{sessionId}"],
      },
      workspaceDir: "/tmp/joopo-bundle-mcp-codex",
      config: { plugins: { enabled: false } },
      additionalConfig: {
        mcpServers: {
          joopo: {
            type: "http",
            url: "http://127.0.0.1:23119/mcp",
            headers: {
              Authorization: "Bearer ${JOOPO_MCP_TOKEN}",
              "x-session-key": "${JOOPO_MCP_SESSION_KEY}",
            },
          },
        },
      },
    });

    expect(prepared.backend.args).toEqual([
      "exec",
      "--json",
      "-c",
      'mcp_servers={ joopo = { url = "http://127.0.0.1:23119/mcp", default_tools_approval_mode = "approve", bearer_token_env_var = "JOOPO_MCP_TOKEN", env_http_headers = { x-session-key = "JOOPO_MCP_SESSION_KEY" } } }',
    ]);
    expect(prepared.backend.resumeArgs).toEqual([
      "exec",
      "resume",
      "{sessionId}",
      "-c",
      'mcp_servers={ joopo = { url = "http://127.0.0.1:23119/mcp", default_tools_approval_mode = "approve", bearer_token_env_var = "JOOPO_MCP_TOKEN", env_http_headers = { x-session-key = "JOOPO_MCP_SESSION_KEY" } } }',
    ]);
    expect(prepared.cleanup).toBeUndefined();
  });
});
