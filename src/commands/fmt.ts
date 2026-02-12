import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { writeOutput, writeError } from "../utils/output.js";
import { parseDom, serializeNode } from "../utils/xpath.js";
import { writeFile } from "node:fs/promises";

/**
 * Extract the XML declaration from the source if present.
 */
function extractDeclaration(xml: string): string | null {
  const match = xml.match(/^<\?xml[^?]*\?>/);
  return match ? match[0] : null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Compact serialization that strips insignificant whitespace.
 */
function serializeCompact(node: Node): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return escapeXml(node.nodeValue || "");
  }
  if (node.nodeType === 4 /* CDATA_SECTION_NODE */) {
    return `<![CDATA[${node.nodeValue || ""}]]>`;
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return "";
  }

  const el = node as Element;
  let attrStr = "";
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrStr += ` ${attr.name}="${escapeXml(attr.value)}"`;
    }
  }

  const children: Node[] = [];
  if (el.childNodes) {
    for (let i = 0; i < el.childNodes.length; i++) {
      children.push(el.childNodes[i]);
    }
  }

  if (children.length === 0) {
    return `<${el.tagName}${attrStr}/>`;
  }

  // Check if any element children exist
  const hasElementChildren = children.some((c) => c.nodeType === 1);

  let inner = "";
  for (const child of children) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      const text = child.nodeValue || "";
      // If this is whitespace-only between elements, skip it
      if (hasElementChildren && !text.trim()) continue;
      inner += escapeXml(text.trim());
    } else {
      inner += serializeCompact(child);
    }
  }

  return `<${el.tagName}${attrStr}>${inner}</${el.tagName}>`;
}

/**
 * Exported for testing.
 */
export async function runFmt(
  xml: string,
  options: { indent?: number; compact?: boolean; inPlace?: boolean },
  filePath?: string,
): Promise<void> {
  const doc = parseDom(xml);
  const declaration = extractDeclaration(xml);

  let output: string;

  if (options.compact) {
    output = serializeCompact(doc.documentElement);
  } else {
    const indent = options.indent ?? 2;
    output = serializeNode(doc.documentElement, indent);
  }

  if (declaration) {
    output = declaration + "\n" + output;
  }

  if (options.inPlace && filePath) {
    await writeFile(filePath, output + "\n", "utf-8");
  } else {
    writeOutput(output, false);
  }
}

export function register(program: Command): void {
  program
    .command("fmt")
    .description("Pretty-print / reformat XML")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--indent <n>", "Spaces per indent level (default: 2)", parseInt, 2)
    .option("--compact", "Minify — remove all insignificant whitespace")
    .option("--in-place", "Overwrite the file instead of writing to stdout")
    .action(
      async (
        file: string | undefined,
        options: { indent?: number; compact?: boolean; inPlace?: boolean },
      ) => {
        try {
          if (options.inPlace && !file) {
            writeError("--in-place requires a file path argument");
            process.exit(1);
            return;
          }
          const xml = await readInput(file);
          await runFmt(xml, options, file);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
