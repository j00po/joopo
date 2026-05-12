export const JOOPO_OWNER_ONLY_CORE_TOOL_NAMES = ["cron", "gateway", "nodes"] as const;

const JOOPO_OWNER_ONLY_CORE_TOOL_NAME_SET: ReadonlySet<string> = new Set(
  JOOPO_OWNER_ONLY_CORE_TOOL_NAMES,
);

export function isJoopoOwnerOnlyCoreToolName(toolName: string): boolean {
  return JOOPO_OWNER_ONLY_CORE_TOOL_NAME_SET.has(toolName);
}
