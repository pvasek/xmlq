import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as xpath from "xpath";

/**
 * Parse XML string into W3C DOM Document.
 */
export function parseDom(xml: string): Document {
  const errors: string[] = [];
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (msg: string) => errors.push(msg),
      fatalError: (msg: string) => errors.push(msg),
    },
  });
  const doc = parser.parseFromString(xml, "text/xml");
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
  return doc;
}

/**
 * Evaluate XPath expression against a document, return matching nodes.
 */
export function selectNodes(
  doc: Document,
  expr: string,
  namespaces?: Record<string, string>,
): Node[] {
  try {
    let selectFn: xpath.XPathSelect;
    if (namespaces && Object.keys(namespaces).length > 0) {
      selectFn = xpath.useNamespaces(namespaces);
    } else {
      selectFn = xpath.select as xpath.XPathSelect;
    }
    const result = selectFn(expr, doc);
    if (Array.isArray(result)) {
      return result as Node[];
    }
    // Single value result (string, number, boolean) — not a node array
    return [];
  } catch (err) {
    throw new Error(
      `Invalid XPath: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Pretty-print a DOM node as XML string with indentation.
 */
export function serializeNode(node: Node, indent = 2): string {
  return serializeNodeRecursive(node, 0, indent);
}

function serializeNodeRecursive(
  node: Node,
  depth: number,
  indent: number,
): string {
  const pad = " ".repeat(depth * indent);

  if (node.nodeType === 3 /* TEXT_NODE */) {
    const text = node.nodeValue || "";
    const trimmed = text.trim();
    return trimmed ? pad + trimmed : "";
  }

  if (node.nodeType === 4 /* CDATA_SECTION_NODE */) {
    return pad + `<![CDATA[${node.nodeValue || ""}]]>`;
  }

  if (node.nodeType === 8 /* COMMENT_NODE */) {
    return pad + `<!--${node.nodeValue || ""}-->`;
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return "";
  }

  const element = node as Element;
  const tagName = element.tagName;

  // Build attribute string
  let attrStr = "";
  if (element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attrStr += ` ${attr.name}="${escapeXml(attr.value)}"`;
    }
  }

  // Collect child nodes
  const children: Node[] = [];
  if (element.childNodes) {
    for (let i = 0; i < element.childNodes.length; i++) {
      children.push(element.childNodes[i]);
    }
  }

  if (children.length === 0) {
    return `${pad}<${tagName}${attrStr}/>`;
  }

  // Check for text-only content
  const textOnly =
    children.length === 1 && children[0].nodeType === 3 /* TEXT_NODE */;
  if (textOnly) {
    const text = children[0].nodeValue || "";
    return `${pad}<${tagName}${attrStr}>${escapeXml(text.trim())}</${tagName}>`;
  }

  // Mixed / element content
  const lines: string[] = [];
  lines.push(`${pad}<${tagName}${attrStr}>`);
  for (const child of children) {
    const serialized = serializeNodeRecursive(child, depth + 1, indent);
    if (serialized) {
      lines.push(serialized);
    }
  }
  lines.push(`${pad}</${tagName}>`);
  return lines.join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Compact serialization using XMLSerializer (no pretty-printing).
 */
export function serializeNodeCompact(node: Node): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(node);
}

/**
 * Convert a DOM node to a JSON-friendly object.
 * - Attributes as @-prefixed keys
 * - Children grouped by tag name (arrays for repeated elements)
 * - Leaf text content as string value
 */
export function nodeToJson(node: Node): unknown {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return node.nodeValue || "";
  }

  if (node.nodeType === 2 /* ATTRIBUTE_NODE */) {
    return (node as Attr).value;
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return null;
  }

  const element = node as Element;
  const result: Record<string, unknown> = {};

  // Add attributes
  if (element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      result[`@${attr.name}`] = attr.value;
    }
  }

  // Collect element children and text
  const childElements: Element[] = [];
  let textContent = "";
  if (element.childNodes) {
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1 /* ELEMENT_NODE */) {
        childElements.push(child as Element);
      } else if (
        child.nodeType === 3 /* TEXT_NODE */ ||
        child.nodeType === 4 /* CDATA_SECTION_NODE */
      ) {
        textContent += child.nodeValue || "";
      }
    }
  }

  // Leaf element: just text
  if (childElements.length === 0) {
    const trimmedText = textContent.trim();
    if (Object.keys(result).length === 0) {
      return trimmedText;
    }
    if (trimmedText) {
      result["#text"] = trimmedText;
    }
    return result;
  }

  // Group children by tag name
  const groups = new Map<string, unknown[]>();
  for (const child of childElements) {
    const tag = child.tagName;
    if (!groups.has(tag)) {
      groups.set(tag, []);
    }
    groups.get(tag)!.push(nodeToJson(child));
  }

  for (const [tag, values] of groups) {
    result[tag] = values.length === 1 ? values[0] : values;
  }

  return result;
}

/**
 * Parse --ns PREFIX=URI option(s) into a namespace map.
 */
export function parseNamespaces(
  nsOption: string | string[] | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!nsOption) return map;

  const items = Array.isArray(nsOption) ? nsOption : [nsOption];
  for (const item of items) {
    const eqIndex = item.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(
        `Invalid namespace mapping: "${item}" (expected PREFIX=URI)`,
      );
    }
    const prefix = item.slice(0, eqIndex);
    const uri = item.slice(eqIndex + 1);
    if (!prefix || !uri) {
      throw new Error(
        `Invalid namespace mapping: "${item}" (expected PREFIX=URI)`,
      );
    }
    map[prefix] = uri;
  }
  return map;
}
