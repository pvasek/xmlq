import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { validateXml } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";

export function register(program: Command): void {
  program
    .command("validate")
    .description("Check if the file is well-formed XML")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .action(async (file: string | undefined) => {
      try {
        const xml = await readInput(file);
        const result = validateXml(xml);

        if (result.valid) {
          writeOutput("OK: well-formed XML", false);
        } else {
          const err = result.error!;
          writeError(`line ${err.line}, col ${err.col}: ${err.message}`);
          process.exit(1);
        }
      } catch (err) {
        writeError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
