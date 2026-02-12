import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";

interface NsEntry {
  prefix: string;
  uri: string;
}

function collectNamespaces(node: XmlNode, seen: Map<string, string>): void {
  for (const [key, value] of Object.entries(node.attributes)) {
    if (key === "xmlns") {
      if (!seen.has("default")) {
        seen.set("default", value);
      }
    } else if (key.startsWith("xmlns:")) {
      const prefix = key.slice(6);
      if (!seen.has(prefix)) {
        seen.set(prefix, value);
      }
    }
  }
  for (const child of node.children) {
    collectNamespaces(child, seen);
  }
}

function formatNamespaces(entries: NsEntry[]): string {
  if (entries.length === 0) return "";
  const maxPrefix = Math.max(...entries.map((e) => e.prefix.length));
  return entries
    .map((e) => `${e.prefix.padEnd(maxPrefix)}  ${e.uri}`)
    .join("\n");
}

/**
 * Exported for testing.
 */
export async function runNs(
  xml: string,
  options: { json?: boolean } = {},
): Promise<void> {
  const { root } = parseXml(xml);
  const seen = new Map<string, string>();
  collectNamespaces(root, seen);

  const entries: NsEntry[] = Array.from(seen.entries()).map(
    ([prefix, uri]) => ({ prefix, uri }),
  );

  if (options.json) {
    writeOutput(entries, true);
  } else {
    if (entries.length > 0) {
      writeOutput(formatNamespaces(entries), false);
    }
  }
}

export function register(program: Command): void {
  program
    .command("ns")
    .description("List namespaces used in the document")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--json", "Output as JSON")
    .action(async (file: string | undefined, options: { json?: boolean }) => {
      try {
        const xml = await readInput(file);
        await runNs(xml, options);
      } catch (err) {
        writeError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
