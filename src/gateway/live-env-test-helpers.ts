const COMMON_LIVE_ENV_NAMES = [
  "JOOPO_AGENT_RUNTIME",
  "JOOPO_CONFIG_PATH",
  "JOOPO_GATEWAY_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "JOOPO_SKIP_BROWSER_CONTROL_SERVER",
  "JOOPO_SKIP_CANVAS_HOST",
  "JOOPO_SKIP_CHANNELS",
  "JOOPO_SKIP_CRON",
  "JOOPO_SKIP_GMAIL_WATCHER",
  "JOOPO_STATE_DIR",
] as const;

export type LiveEnvSnapshot = Record<string, string | undefined>;

export function snapshotLiveEnv(extraNames: readonly string[] = []): LiveEnvSnapshot {
  const snapshot: LiveEnvSnapshot = {};
  for (const name of [...COMMON_LIVE_ENV_NAMES, ...extraNames]) {
    snapshot[name] = process.env[name];
  }
  return snapshot;
}

export function restoreLiveEnv(snapshot: LiveEnvSnapshot): void {
  for (const [name, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}
