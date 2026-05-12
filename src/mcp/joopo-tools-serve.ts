/**
 * Standalone MCP server for selected built-in Joopo tools.
 *
 * Run via: node --import tsx src/mcp/joopo-tools-serve.ts
 * Or: bun src/mcp/joopo-tools-serve.ts
 */
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { createCronTool } from "../agents/tools/cron-tool.js";
import { formatErrorMessage } from "../infra/errors.js";
import { connectToolsMcpServerToStdio, createToolsMcpServer } from "./tools-stdio-server.js";

export function resolveJoopoToolsForMcp(): AnyAgentTool[] {
  return [createCronTool()];
}

function createJoopoToolsMcpServer(
  params: {
    tools?: AnyAgentTool[];
  } = {},
): Server {
  const tools = params.tools ?? resolveJoopoToolsForMcp();
  return createToolsMcpServer({ name: "joopo-tools", tools });
}

async function serveJoopoToolsMcp(): Promise<void> {
  const server = createJoopoToolsMcpServer();
  await connectToolsMcpServerToStdio(server);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  serveJoopoToolsMcp().catch((err) => {
    process.stderr.write(`joopo-tools-serve: ${formatErrorMessage(err)}\n`);
    process.exit(1);
  });
}
