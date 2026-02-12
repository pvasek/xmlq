import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";

interface TreeOptions {
  depth?: number;
  attrs?: boolean;
  counts?: boolean;
}

/**
 * A merged structural node. Represents one unique element name
 * across all sibling instances, with merged children and attributes.
 */
interface StructNode {
  name: string;
  attributes: Set<string>;
  children: Map<string, StructNode>;
  childOrder: string[];
  hasMixedContent: boolean;
  /** Per-parent occurrence counts for range notation */
  occurrenceCounts: number[];
}

function isNamespaceAttr(name: string): boolean {
  return name === "xmlns" || name.startsWith("xmlns:");
}

/**
 * Build a structural skeleton by merging all instances of same-named
 * siblings into a single StructNode.
 */
function buildStructure(nodes: XmlNode[]): Map<string, StructNode> {
  const merged = new Map<string, StructNode>();
  const order: string[] = [];

  // Count occurrences of each name in this sibling group
  const counts = new Map<string, number>();
  for (const node of nodes) {
    counts.set(node.name, (counts.get(node.name) || 0) + 1);
  }

  // Group nodes by name
  const groups = new Map<string, XmlNode[]>();
  for (const node of nodes) {
    if (!groups.has(node.name)) {
      groups.set(node.name, []);
      order.push(node.name);
    }
    groups.get(node.name)!.push(node);
  }

  for (const [name, instances] of groups) {
    const struct: StructNode = {
      name,
      attributes: new Set(),
      children: new Map(),
      childOrder: [],
      hasMixedContent: false,
      occurrenceCounts: [counts.get(name)!],
    };

    for (const instance of instances) {
      // Merge attributes (exclude xmlns)
      for (const attrName of Object.keys(instance.attributes)) {
        if (!isNamespaceAttr(attrName)) {
          struct.attributes.add(attrName);
        }
      }

      // Detect mixed content
      if (instance.text && instance.children.length > 0) {
        struct.hasMixedContent = true;
      }

      // Recursively merge children
      const childStruct = buildStructure(instance.children);
      for (const [childName, childNode] of childStruct) {
        if (struct.children.has(childName)) {
          // Merge into existing
          const existing = struct.children.get(childName)!;
          for (const attr of childNode.attributes) {
            existing.attributes.add(attr);
          }
          if (childNode.hasMixedContent) {
            existing.hasMixedContent = true;
          }
          // Merge occurrence counts
          existing.occurrenceCounts.push(...childNode.occurrenceCounts);
          // Merge deeper children
          mergeChildren(existing, childNode);
        } else {
          struct.children.set(childName, childNode);
          if (!struct.childOrder.includes(childName)) {
            struct.childOrder.push(childName);
          }
        }
      }
    }

    merged.set(name, struct);
  }

  return merged;
}

function mergeChildren(target: StructNode, source: StructNode): void {
  for (const [childName, childNode] of source.children) {
    if (target.children.has(childName)) {
      const existing = target.children.get(childName)!;
      for (const attr of childNode.attributes) {
        existing.attributes.add(attr);
      }
      if (childNode.hasMixedContent) {
        existing.hasMixedContent = true;
      }
      existing.occurrenceCounts.push(...childNode.occurrenceCounts);
      mergeChildren(existing, childNode);
    } else {
      target.children.set(childName, childNode);
      if (!target.childOrder.includes(childName)) {
        target.childOrder.push(childName);
      }
    }
  }
}

function formatCount(counts: number[]): string {
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === max) {
    return min > 1 ? `  (x${min})` : "";
  }
  return `  (x${min}..${max})`;
}

function renderTree(
  node: StructNode,
  options: TreeOptions,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
  depth: number,
): string[] {
  const lines: string[] = [];
  const connector = isRoot ? "" : isLast ? "└── " : "├── ";
  const countStr = options.counts !== false ? formatCount(node.occurrenceCounts) : "";
  lines.push(`${prefix}${connector}${node.name}${countStr}`);

  const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");

  if (options.depth !== undefined && depth >= options.depth) {
    return lines;
  }

  // Collect display items: attributes, #text, children
  const items: { type: "attr" | "text" | "child"; name: string; node?: StructNode }[] = [];

  if (options.attrs !== false) {
    const sortedAttrs = Array.from(node.attributes).sort();
    for (const attr of sortedAttrs) {
      items.push({ type: "attr", name: `@${attr}` });
    }
  }

  if (node.hasMixedContent) {
    items.push({ type: "text", name: "#text" });
  }

  for (const childName of node.childOrder) {
    const child = node.children.get(childName)!;
    items.push({ type: "child", name: childName, node: child });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemIsLast = i === items.length - 1;

    if (item.type === "attr" || item.type === "text") {
      const itemConnector = itemIsLast ? "└── " : "├── ";
      lines.push(`${childPrefix}${itemConnector}${item.name}`);
    } else {
      lines.push(
        ...renderTree(item.node!, options, childPrefix, itemIsLast, false, depth + 1),
      );
    }
  }

  return lines;
}

/**
 * Exported for testing.
 */
export async function runTree(xml: string, options: TreeOptions): Promise<void> {
  const { root } = parseXml(xml);

  // Build structural skeleton from root
  const rootStruct: StructNode = {
    name: root.name,
    attributes: new Set(
      Object.keys(root.attributes).filter((a) => !isNamespaceAttr(a)),
    ),
    children: new Map(),
    childOrder: [],
    hasMixedContent: root.text !== "" && root.children.length > 0,
    occurrenceCounts: [1],
  };

  // Merge children structure
  const childStruct = buildStructure(root.children);
  rootStruct.children = childStruct;
  rootStruct.childOrder = Array.from(childStruct.keys());

  const lines = renderTree(rootStruct, options, "", true, true, 1);
  writeOutput(lines.join("\n"), false);
}

export function register(program: Command): void {
  program
    .command("tree")
    .description("Show the structural skeleton of the document")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--depth <n>", "Limit tree depth", parseInt)
    .option("--no-attrs", "Hide attributes")
    .option("--no-counts", "Hide repetition counts")
    .action(
      async (
        file: string | undefined,
        options: { depth?: number; attrs?: boolean; counts?: boolean },
      ) => {
        try {
          const xml = await readInput(file);
          await runTree(xml, options);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
