import { commandsListCommand } from "./commands_list.js";
import { approveCommand } from "./stdlib/approve.js";
import { askCommand } from "./stdlib/ask.js";
import { dedupeCommand } from "./stdlib/dedupe.js";
import { diffLastCommand } from "./stdlib/diff_last.js";
import { emailTriageCommand } from "./stdlib/email_triage.js";
import { execCommand } from "./stdlib/exec.js";
import { gogGmailSearchCommand } from "./stdlib/gog_gmail_search.js";
import { gogGmailSendCommand } from "./stdlib/gog_gmail_send.js";
import { groupByCommand } from "./stdlib/group_by.js";
import { headCommand } from "./stdlib/head.js";
import { joopobotInvokeCommand, joopoInvokeCommand } from "./stdlib/joopo_invoke.js";
import { jsonCommand } from "./stdlib/json.js";
import { llmInvokeCommand } from "./stdlib/llm_invoke.js";
import { llmTaskInvokeCommand } from "./stdlib/llm_task_invoke.js";
import { mapCommand } from "./stdlib/map.js";
import { pickCommand } from "./stdlib/pick.js";
import { sortCommand } from "./stdlib/sort.js";
import { stateGetCommand, stateSetCommand } from "./stdlib/state.js";
import { tableCommand } from "./stdlib/table.js";
import { templateCommand } from "./stdlib/template.js";
import { whereCommand } from "./stdlib/where.js";
import { workflowsListCommand } from "./workflows/workflows_list.js";
import { workflowsRunCommand } from "./workflows/workflows_run.js";

export function createDefaultRegistry() {
  const commands = new Map();

  for (const cmd of [
    execCommand,
    headCommand,
    jsonCommand,
    pickCommand,
    tableCommand,
    whereCommand,
    sortCommand,
    dedupeCommand,
    templateCommand,
    mapCommand,
    groupByCommand,
    approveCommand,
    askCommand,
    joopoInvokeCommand,
    joopobotInvokeCommand,
    llmInvokeCommand,
    llmTaskInvokeCommand,
    stateGetCommand,
    stateSetCommand,
    diffLastCommand,
    workflowsListCommand,
    workflowsRunCommand,
    commandsListCommand,
    gogGmailSearchCommand,
    gogGmailSendCommand,
    emailTriageCommand,
  ]) {
    commands.set(cmd.name, cmd);
  }

  return {
    get(name) {
      return commands.get(name);
    },
    list() {
      return [...commands.keys()].sort();
    },
  };
}
