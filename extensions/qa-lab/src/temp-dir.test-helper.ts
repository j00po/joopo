import {
  tempWorkspace,
  resolvePreferredJoopoTmpDir,
  type TempWorkspace,
} from "joopo/plugin-sdk/temp-path";

export function createTempDirHarness() {
  const tempDirs: TempWorkspace[] = [];

  return {
    async cleanup() {
      await Promise.all(tempDirs.splice(0).map((dir) => dir.cleanup()));
    },
    async makeTempDir(prefix: string) {
      const dir = await tempWorkspace({
        rootDir: resolvePreferredJoopoTmpDir(),
        prefix,
      });
      tempDirs.push(dir);
      return dir.dir;
    },
  };
}
