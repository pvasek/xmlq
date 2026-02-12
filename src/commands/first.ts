import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeError } from "../utils/output.js";
import { parseNamespaces } from "../utils/xpath.js";
import { runSelect } from "./select.js";

/**
 * Exported for testing — handles argument disambiguation and delegates to runSelect.
 */
export async function runFirst(
  xml: string,
  nOrXpath: string | undefined,
  xpathOrFile: string | undefined,
  file: string | undefined,
  namespaces?: Record<string, string>,
): Promise<void> {
  let n: number;
  let xpathExpr: string;

  if (nOrXpath && /^\d+$/.test(nOrXpath)) {
    // First arg is a number
    n = parseInt(nOrXpath, 10);
    xpathExpr = xpathOrFile || "";
  } else {
    // First arg is an xpath expression
    n = 1;
    xpathExpr = nOrXpath || "";
    // Shift: what was xpathOrFile is actually the file
    file = xpathOrFile;
  }

  if (!xpathExpr) {
    writeError("XPath expression is required");
    process.exit(1);
    return;
  }

  await runSelect(xml, xpathExpr, { first: n }, namespaces);
}

export function register(program: Command): void {
  program
    .command("first")
    .description("Select first N matching nodes (default: 1)")
    .argument("[n_or_xpath]", "Number of matches or XPath expression")
    .argument("[xpath_or_file]", "XPath expression or file path")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .action(
      async (
        nOrXpath: string | undefined,
        xpathOrFile: string | undefined,
        file: string | undefined,
        command: Command,
      ) => {
        try {
          // Determine actual file path based on disambiguation
          let actualFile: string | undefined;
          let xpathExpr: string;
          let n: number;

          if (nOrXpath && /^\d+$/.test(nOrXpath)) {
            n = parseInt(nOrXpath, 10);
            xpathExpr = xpathOrFile || "";
            actualFile = file;
          } else {
            n = 1;
            xpathExpr = nOrXpath || "";
            actualFile = xpathOrFile;
          }

          const xml = await readInput(actualFile);
          const nsOption = command.parent?.opts()?.ns;
          const namespaces = parseNamespaces(nsOption);
          await runSelect(xml, xpathExpr, { first: n }, namespaces);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
