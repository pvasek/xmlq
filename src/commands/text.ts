import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeOutput, writeError } from "../utils/output.js";
import { parseDom, selectNodes, parseNamespaces } from "../utils/xpath.js";

interface TextOptions {
  first?: number;
  trim?: boolean;
}

/**
 * Exported for testing — runs the text extraction logic.
 */
export async function runText(
  xml: string,
  xpathExpr: string,
  options: TextOptions,
  namespaces?: Record<string, string>,
): Promise<void> {
  let nodes: Node[];
  try {
    const doc = parseDom(xml);
    nodes = selectNodes(doc, xpathExpr, namespaces);
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err));
    process.exit(1);
    return;
  }

  if (options.first !== undefined && options.first > 0) {
    nodes = nodes.slice(0, options.first);
  }

  const shouldTrim = options.trim !== false;
  const lines = nodes.map((n) => {
    const text = n.textContent || "";
    return shouldTrim ? text.trim() : text;
  });

  writeOutput(lines.join("\n"), false);
}

export function register(program: Command): void {
  program
    .command("text")
    .description("Extract text content of matched nodes")
    .argument("<xpath>", "XPath expression")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--first <n>", "Limit to first N matches", parseInt)
    .option("--trim", "Trim whitespace (default: on)", true)
    .option("--no-trim", "Preserve original whitespace")
    .action(
      async (
        xpathExpr: string,
        file: string | undefined,
        options: TextOptions,
        command: Command,
      ) => {
        try {
          const xml = await readInput(file);
          const nsOption = command.parent?.opts()?.ns;
          const namespaces = parseNamespaces(nsOption);
          await runText(xml, xpathExpr, options, namespaces);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
