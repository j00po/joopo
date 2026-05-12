import process from "node:process";

/**
 * Block CLI execution when running as root (uid 0 or euid 0) unless explicitly opted in.
 *
 * Running as root causes:
 * - Separate state dir (/root/.joopo/ vs /home/<user>/.joopo/)
 * - Conflicting systemd user services (port 18789 race)
 * - Root-owned files in the service user's state dir (EACCES)
 */
export function assertNotRoot(env: NodeJS.ProcessEnv = process.env): void {
  if (typeof process.getuid !== "function") {
    return;
  }
  const uid = process.getuid();
  const euid = typeof process.geteuid === "function" ? process.geteuid() : uid;
  if (uid !== 0 && euid !== 0) {
    return;
  }
  if (
    env.JOOPO_ALLOW_ROOT === "1" ||
    (env.JOOPO_CLI_CONTAINER_BYPASS === "1" && env.JOOPO_CONTAINER_HINT)
  ) {
    return;
  }
  process.stderr.write(
    "[joopo] Refusing to run as root.\n" +
      "\n" +
      "Running the CLI as root causes:\n" +
      "  - A separate state directory under /root/.joopo/ instead of the service user's\n" +
      "  - Conflicting systemd user services that race on port 18789\n" +
      "  - Root-owned files in the service user's state dir (EACCES errors)\n" +
      "\n" +
      "Run as a non-root user (e.g. su - <service-user>),\n" +
      "or override this check:\n" +
      "  JOOPO_ALLOW_ROOT=1 joopo ...\n",
  );
  process.exit(1);
}
