function quoteShellArg(value: string): string {
  if (process.platform === "win32") {
    return `'${value.replaceAll("'", "''")}'`;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function buildCurrentJoopoCliArgv(args: string[]): string[] {
  const entry = process.argv[1]?.trim();
  return entry && entry !== process.execPath
    ? [process.execPath, ...process.execArgv, entry, ...args]
    : [process.execPath, ...args];
}

export function buildCurrentJoopoCliCommand(args: string[]): string {
  return buildCurrentJoopoCliArgv(args).map(quoteShellArg).join(" ");
}
