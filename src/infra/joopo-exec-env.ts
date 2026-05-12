export const JOOPO_CLI_ENV_VAR = "JOOPO_CLI";
export const JOOPO_CLI_ENV_VALUE = "1";

export function markJoopoExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [JOOPO_CLI_ENV_VAR]: JOOPO_CLI_ENV_VALUE,
  };
}

export function ensureJoopoExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[JOOPO_CLI_ENV_VAR] = JOOPO_CLI_ENV_VALUE;
  return env;
}
