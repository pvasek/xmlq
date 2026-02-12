import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import {
  parseDom,
  selectNodes,
  parseNamespaces,
} from "../utils/xpath.js";
import { writeOutput, writeError } from "../utils/output.js";

interface AttrInfo {
  path: string;
  uniqueCount: number;
  values: string[];
}

function isNamespaceAttr(name: string): boolean {
  return name === "xmlns" || name.startsWith("xmlns:");
}

/**
 * Discover all attributes in the document, grouped by element/@attr path.
 */
function discoverAttrs(node: XmlNode, parentPath: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  for (const [attrName, attrValue] of Object.entries(node.attributes)) {
    if (isNamespaceAttr(attrName)) continue;
    const path = `${parentPath ? parentPath + "/" : ""}${node.name}/@${attrName}`;
    if (!result.has(path)) {
      result.set(path, new Set());
    }
    result.get(path)!.add(attrValue);
  }

  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  for (const child of node.children) {
    const childAttrs = discoverAttrs(child, currentPath);
    for (const [path, values] of childAttrs) {
      if (!result.has(path)) {
        result.set(path, new Set());
      }
      for (const v of values) {
        result.get(path)!.add(v);
      }
    }
  }

  return result;
}

/**
 * Collect attributes from matched DOM nodes (from XPath).
 */
function collectAttrsFromNodes(nodes: Node[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  for (const node of nodes) {
    if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const el = node as Element;
    if (!el.attributes) continue;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (isNamespaceAttr(attr.name)) continue;
      const key = `@${attr.name}`;
      if (!result.has(key)) {
        result.set(key, new Set());
      }
      result.get(key)!.add(attr.value);
    }
  }

  return result;
}

function formatAttrInfo(
  attrs: AttrInfo[],
  showAllValues: boolean,
): string {
  if (attrs.length === 0) return "";

  const maxPath = Math.max(...attrs.map((a) => a.path.length));

  return attrs
    .map((a) => {
      const countStr = `${a.uniqueCount} unique value${a.uniqueCount !== 1 ? "s" : ""}`;
      let line = `${a.path.padEnd(maxPath)}  ${countStr}`;

      if (showAllValues || a.uniqueCount <= 10) {
        const sorted = [...a.values].sort();
        line += `  [${sorted.join(", ")}]`;
      }

      return line;
    })
    .join("\n");
}

/**
 * Exported for testing.
 */
export async function runAttrs(
  xml: string,
  xpathExpr: string | undefined,
  options: { values?: boolean; json?: boolean },
  namespaces?: Record<string, string>,
): Promise<void> {
  let attrMap: Map<string, Set<string>>;

  if (xpathExpr) {
    // XPath mode: match elements then collect their attributes
    const doc = parseDom(xml);
    const nodes = selectNodes(doc, xpathExpr, namespaces);
    attrMap = collectAttrsFromNodes(nodes);
  } else {
    // Discovery mode: walk the entire document
    const { root } = parseXml(xml);
    attrMap = discoverAttrs(root, "");
  }

  const attrs: AttrInfo[] = Array.from(attrMap.entries()).map(
    ([path, values]) => ({
      path,
      uniqueCount: values.size,
      values: Array.from(values).sort(),
    }),
  );

  if (options.json) {
    writeOutput(attrs, true);
  } else {
    if (attrs.length > 0) {
      writeOutput(formatAttrInfo(attrs, options.values === true), false);
    }
  }
}

/**
 * Disambiguate whether the first positional arg is an XPath expression or a file path.
 * Heuristic: if it starts with / or ./ or contains [ or @, treat as XPath.
 * Otherwise check if it looks like a file path.
 */
function isXPath(arg: string): boolean {
  // XPath patterns: starts with /, //, contains [] or @ or ()
  if (arg.startsWith("//")) return true;
  if (arg.startsWith("/")) return true;
  if (arg.startsWith("./")) return false; // filesystem relative path
  if (arg.includes("[") || arg.includes("@") || arg.includes("(")) return true;
  return false;
}

export function register(program: Command): void {
  program
    .command("attrs")
    .description("List attributes of matched elements")
    .argument("[xpath]", "XPath expression (if omitted, discovers all attributes)")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--values", "List all unique values per attribute")
    .option("--json", "Output as JSON")
    .action(
      async (
        xpathOrFile: string | undefined,
        file: string | undefined,
        options: { values?: boolean; json?: boolean },
        command: Command,
      ) => {
        try {
          let xpathExpr: string | undefined;
          let actualFile: string | undefined;

          if (xpathOrFile) {
            if (isXPath(xpathOrFile)) {
              xpathExpr = xpathOrFile;
              actualFile = file;
            } else {
              // First arg is a file path, no xpath given
              xpathExpr = undefined;
              actualFile = xpathOrFile;
            }
          }

          const xml = await readInput(actualFile);
          const nsOption = command.parent?.opts()?.ns;
          const namespaces = parseNamespaces(nsOption);
          await runAttrs(xml, xpathExpr, options, namespaces);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
