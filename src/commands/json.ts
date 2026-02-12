import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeOutput, writeError } from "../utils/output.js";
import { parseDom, nodeToJson } from "../utils/xpath.js";

/**
 * Exported for testing.
 */
export async function runJson(
  xml: string,
  options: { compact?: boolean },
): Promise<void> {
  const doc = parseDom(xml);
  const json = nodeToJson(doc.documentElement);

  if (options.compact) {
    process.stdout.write(JSON.stringify(json) + "\n");
  } else {
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
  }
}

export function register(program: Command): void {
  program
    .command("json")
    .description("Convert XML to JSON")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--compact", "Minify JSON output")
    .action(
      async (
        file: string | undefined,
        options: { compact?: boolean },
      ) => {
        try {
          const xml = await readInput(file);
          await runJson(xml, options);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
