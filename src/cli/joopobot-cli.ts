import type { Command } from "commander";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerJoopobotCli(program: Command) {
  const joopobot = program
    .command("joopobot")
    .description("Legacy joopobot command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/joopobot", "docs.joopo.ai/cli/joopobot")}\n`,
    );
  registerQrCli(joopobot);
}
