import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ValidationResult {
  valid: boolean;
  error?: { message: string; line: number; col: number };
}

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export interface ParseResult {
  root: XmlNode;
  rawXml: string;
}

/**
 * Validate whether a string is well-formed XML.
 */
export function validateXml(xml: string): ValidationResult {
  if (!xml.trim()) {
    return { valid: false, error: { message: "Empty input", line: 1, col: 1 } };
  }

  const result = XMLValidator.validate(xml, {
    allowBooleanAttributes: false,
  });

  if (result === true) {
    return { valid: true };
  }

  return {
    valid: false,
    error: {
      message: result.err.msg,
      line: result.err.line,
      col: result.err.col,
    },
  };
}

const parserOptions = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  trimValues: false,
  cdataPropName: "#cdata",
  processEntities: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
};

/**
 * Convert the preserveOrder output into our XmlNode tree.
 */
function toXmlNode(raw: Record<string, unknown>): XmlNode | null {
  // Each item in preserveOrder output is an object with one key = tag name
  // plus optional ":@" for attributes
  const attrs: Record<string, string> = {};
  const rawAttrs = raw[":@"] as Record<string, string> | undefined;
  if (rawAttrs) {
    for (const [key, val] of Object.entries(rawAttrs)) {
      attrs[key] = String(val);
    }
  }

  // Find the element key (not ":@", not "#text", not "#cdata")
  for (const key of Object.keys(raw)) {
    if (key === ":@") continue;

    if (key === "#text" || key === "#cdata") {
      return null; // text nodes are handled by the parent
    }

    const childrenRaw = raw[key] as Record<string, unknown>[];
    const children: XmlNode[] = [];
    const textParts: string[] = [];

    if (Array.isArray(childrenRaw)) {
      for (const child of childrenRaw) {
        if ("#text" in child) {
          textParts.push(String(child["#text"]));
        } else if ("#cdata" in child) {
          const cdataContent = child["#cdata"] as Record<string, unknown>[];
          if (Array.isArray(cdataContent)) {
            for (const part of cdataContent) {
              if ("#text" in part) textParts.push(String(part["#text"]));
            }
          } else {
            textParts.push(String(cdataContent));
          }
        } else {
          const node = toXmlNode(child);
          if (node) children.push(node);
        }
      }
    }

    return {
      name: key,
      attributes: attrs,
      children,
      text: textParts.join(""),
    };
  }

  return null;
}

/**
 * Parse XML string into an XmlNode tree.
 * Throws on invalid XML.
 */
export function parseXml(xml: string): ParseResult {
  const validation = validateXml(xml);
  if (!validation.valid) {
    throw new Error(validation.error!.message);
  }

  const parser = new XMLParser(parserOptions);
  const parsed = parser.parse(xml) as Record<string, unknown>[];

  // Find the root element (skip processing instructions, declarations)
  for (const item of parsed) {
    const node = toXmlNode(item);
    if (node) {
      return { root: node, rawXml: xml };
    }
  }

  throw new Error("No root element found");
}
