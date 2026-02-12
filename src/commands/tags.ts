import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";

interface TagCount {
  name: string;
  count: number;
}

function collectTags(
  node: XmlNode,
  counts: Map<string, number>,
  depth: number,
  maxDepth?: number,
): void {
  if (maxDepth !== undefined && depth > maxDepth) return;
  counts.set(node.name, (counts.get(node.name) || 0) + 1);
  for (const child of node.children) {
    collectTags(child, counts, depth + 1, maxDepth);
  }
}

function sortTags(tags: TagCount[], sort: string): TagCount[] {
  if (sort === "name") {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }
  // sort by count descending, tie-break alphabetically
  return tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatTags(tags: TagCount[]): string {
  if (tags.length === 0) return "";
  const maxCount = Math.max(...tags.map((t) => t.count));
  const width = String(maxCount).length;
  return tags.map((t) => `${String(t.count).padStart(width)}  ${t.name}`).join("\n");
}

/**
 * Exported for testing — runs the tags logic on pre-read XML.
 */
export async function runTags(
  xml: string,
  options: { sort?: string; depth?: number; json?: boolean },
): Promise<void> {
  const { root } = parseXml(xml);
  const counts = new Map<string, number>();
  collectTags(root, counts, 1, options.depth);

  const tags: TagCount[] = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
  }));
  sortTags(tags, options.sort || "count");

  if (options.json) {
    writeOutput(tags, true);
  } else {
    writeOutput(formatTags(tags), false);
  }
}

export function register(program: Command): void {
  program
    .command("tags")
    .description("List all unique element names with occurrence counts")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--sort <order>", "Sort order: count (default) or name", "count")
    .option("--depth <n>", "Only count tags up to depth N", parseInt)
    .option("--json", "Output as JSON")
    .action(
      async (
        file: string | undefined,
        options: { sort?: string; depth?: number; json?: boolean },
      ) => {
        try {
          const xml = await readInput(file);
          await runTags(xml, options);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
