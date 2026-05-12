import os from "node:os";
import { movePathToTrash as movePathToTrashWithAllowedRoots } from "joopo/plugin-sdk/browser-config";
import { resolvePreferredJoopoTmpDir } from "joopo/plugin-sdk/temp-path";

export async function movePathToTrash(targetPath: string): Promise<string> {
  return await movePathToTrashWithAllowedRoots(targetPath, {
    allowedRoots: [os.homedir(), resolvePreferredJoopoTmpDir()],
  });
}
