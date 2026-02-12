import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeError } from "../utils/output.js";
import { parseNamespaces } from "../utils/xpath.js";
import { runSelect } from "./select.js";

export function register(program: Command): void {
  program
    .command("count")
    .description("Count matches for an XPath expression")
    .argument("<xpath>", "XPath expression")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .action(
      async (xpathExpr: string, file: string | undefined, command: Command) => {
        try {
          const xml = await readInput(file);
          const nsOption = command.parent?.opts()?.ns;
          const namespaces = parseNamespaces(nsOption);
          await runSelect(xml, xpathExpr, { count: true }, namespaces);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
