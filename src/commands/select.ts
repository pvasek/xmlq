import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeOutput, writeError } from "../utils/output.js";
import {
  parseDom,
  selectNodes,
  serializeNode,
  serializeNodeCompact,
  nodeToJson,
  parseNamespaces,
} from "../utils/xpath.js";

export interface SelectOptions {
  first?: number;
  count?: boolean;
  text?: boolean;
  attr?: string;
  compact?: boolean;
  json?: boolean;
  wrap?: boolean;
}

/**
 * Core select logic — exported for testing and reuse by alias commands.
 */
export async function runSelect(
  xml: string,
  xpathExpr: string,
  options: SelectOptions,
  namespaces?: Record<string, string>,
): Promise<void> {
  let doc: ReturnType<typeof parseDom>;
  let nodes: Node[];
  try {
    doc = parseDom(xml);
    nodes = selectNodes(doc, xpathExpr, namespaces);
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err));
    process.exit(1);
    return; // unreachable, satisfies TS
  }

  if (options.first !== undefined && options.first > 0) {
    nodes = nodes.slice(0, options.first);
  }

  // --count: just output the number
  if (options.count) {
    writeOutput(String(nodes.length), false);
    return;
  }

  if (nodes.length === 0) {
    return;
  }

  // --text: output text content, one per line
  if (options.text) {
    const lines = nodes.map((n) => (n.textContent || "").trim());
    writeOutput(lines.join("\n"), false);
    return;
  }

  // --attr NAME: output attribute values, one per line
  if (options.attr) {
    const attrName = options.attr;
    const lines = nodes.map((n) => {
      if (n.nodeType === 1 /* ELEMENT_NODE */) {
        return (n as Element).getAttribute(attrName) || "";
      }
      return "";
    });
    writeOutput(lines.join("\n"), false);
    return;
  }

  // --json: convert to JSON
  if (options.json) {
    const jsonArray = nodes.map((n) => nodeToJson(n));
    writeOutput(jsonArray, true);
    return;
  }

  // Default: XML fragment output
  const serialized = nodes.map((n) =>
    options.compact ? serializeNodeCompact(n) : serializeNode(n),
  );

  if (options.wrap) {
    const inner = serialized
      .map((s) =>
        s
          .split("\n")
          .map((line) => "  " + line)
          .join("\n"),
      )
      .join("\n");
    writeOutput(`<results>\n${inner}\n</results>`, false);
  } else {
    writeOutput(serialized.join("\n"), false);
  }
}

export function register(program: Command): void {
  program
    .command("select")
    .description("Query nodes using XPath expressions")
    .argument("<xpath>", "XPath expression")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--first <n>", "Return only first N matches", parseInt)
    .option("--count", "Just print the number of matches")
    .option("--text", "Extract text content only")
    .option("--attr <name>", "Extract a specific attribute value")
    .option("--compact", "Output XML without pretty-printing")
    .option("--json", "Convert matched nodes to JSON")
    .option("--wrap", "Wrap multiple results in a <results> root element")
    .action(
      async (
        xpathExpr: string,
        file: string | undefined,
        options: SelectOptions,
        command: Command,
      ) => {
        try {
          const xml = await readInput(file);
          const nsOption = command.parent?.opts()?.ns;
          const namespaces = parseNamespaces(nsOption);
          await runSelect(xml, xpathExpr, options, namespaces);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
