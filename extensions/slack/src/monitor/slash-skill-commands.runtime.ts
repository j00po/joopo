import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "joopo/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("joopo/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
