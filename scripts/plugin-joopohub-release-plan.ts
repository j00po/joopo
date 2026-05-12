#!/usr/bin/env -S node --import tsx

import { pathToFileURL } from "node:url";
import {
  collectPluginJoopoHubReleasePlan,
  parsePluginReleaseArgs,
} from "./lib/plugin-joopohub-release.ts";

export async function collectPluginReleasePlanForJoopoHub(argv: string[]) {
  const { selection, selectionMode, baseRef, headRef } = parsePluginReleaseArgs(argv);
  return await collectPluginJoopoHubReleasePlan({
    selection,
    selectionMode,
    gitRange: baseRef && headRef ? { baseRef, headRef } : undefined,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const plan = await collectPluginReleasePlanForJoopoHub(process.argv.slice(2));
  console.log(JSON.stringify(plan, null, 2));
}
