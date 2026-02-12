import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";
import { formatSize, formatNumber } from "../utils/format.js";

interface StatResult {
  file: string;
  fileSize: number;
  root: string;
  rootDisplay: string;
  elements: number;
  maxDepth: number;
  namespaces: string[];
  topLevel: { name: string; count: number }[];
}

function countElements(node: XmlNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countElements(child);
  }
  return count;
}

function getMaxDepth(node: XmlNode, depth = 1): number {
  if (node.children.length === 0) return depth;
  let max = depth;
  for (const child of node.children) {
    const childDepth = getMaxDepth(child, depth + 1);
    if (childDepth > max) max = childDepth;
  }
  return max;
}

function collectNamespaces(node: XmlNode, namespaces: Set<string>): void {
  for (const [key, value] of Object.entries(node.attributes)) {
    if (key === "xmlns" || key.startsWith("xmlns:")) {
      namespaces.add(value);
    }
  }
  for (const child of node.children) {
    collectNamespaces(child, namespaces);
  }
}

function getTopLevelChildren(node: XmlNode): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const child of node.children) {
    counts.set(child.name, (counts.get(child.name) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

function buildRootDisplay(node: XmlNode): string {
  const nsAttrs = Object.entries(node.attributes)
    .filter(([k]) => k === "xmlns" || k.startsWith("xmlns:"))
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return nsAttrs ? `<${node.name} ${nsAttrs}>` : `<${node.name}>`;
}

function computeStat(xml: string, filePath: string | undefined): StatResult {
  const { root } = parseXml(xml);
  const namespaces = new Set<string>();
  collectNamespaces(root, namespaces);

  return {
    file: filePath || "(stdin)",
    fileSize: Buffer.byteLength(xml, "utf-8"),
    root: root.name,
    rootDisplay: buildRootDisplay(root),
    elements: countElements(root),
    maxDepth: getMaxDepth(root),
    namespaces: Array.from(namespaces),
    topLevel: getTopLevelChildren(root),
  };
}

function formatStat(stat: StatResult): string {
  const lines: string[] = [];
  const sizeStr = formatSize(stat.fileSize);
  lines.push(`File:       ${stat.file} (${sizeStr})`);
  lines.push(`Root:       ${stat.rootDisplay}`);
  lines.push(`Elements:   ${formatNumber(stat.elements)}`);
  lines.push(`Max depth:  ${stat.maxDepth}`);

  if (stat.namespaces.length > 0) {
    lines.push(`Namespaces: ${stat.namespaces.join(", ")}`);
  }

  if (stat.topLevel.length > 0) {
    const parts = stat.topLevel.map((t) => `<${t.name}> x ${t.count}`);
    lines.push(`Top-level:  ${parts.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Exported for testing — runs the stat logic on pre-read XML.
 */
export async function runStat(
  xml: string,
  filePath: string | undefined,
  options: { json?: boolean },
): Promise<void> {
  const stat = computeStat(xml, filePath);

  if (options.json) {
    writeOutput(
      {
        file: stat.file,
        fileSize: stat.fileSize,
        root: stat.root,
        elements: stat.elements,
        maxDepth: stat.maxDepth,
        namespaces: stat.namespaces,
        topLevel: stat.topLevel,
      },
      true,
    );
  } else {
    writeOutput(formatStat(stat), false);
  }
}

export function register(program: Command): void {
  program
    .command("stat")
    .description("Quick overview of an XML file")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--json", "Output as JSON")
    .action(async (file: string | undefined, options: { json?: boolean }) => {
      try {
        const xml = await readInput(file);
        await runStat(xml, file, options);
      } catch (err) {
        writeError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
