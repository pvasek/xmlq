import type { Command } from "commander";
import { readInput } from "../utils/input.js";
import { parseXml } from "../utils/parse.js";
import type { XmlNode } from "../utils/parse.js";
import { writeOutput, writeError } from "../utils/output.js";

interface AttrSchema {
  name: string;
  values: Set<string>;
  count: number;
}

interface ElementSchema {
  name: string;
  count: number;
  /** Per-parent occurrence counts for range notation */
  occurrenceCounts: number[];
  attrs: Map<string, AttrSchema>;
  children: Map<string, ElementSchema>;
  childOrder: string[];
  textValues: string[];
  hasText: boolean;
  hasChildren: boolean;
}

function isNamespaceAttr(name: string): boolean {
  return name === "xmlns" || name.startsWith("xmlns:");
}

/**
 * Build schema by merging all instances of same-named elements.
 */
function buildSchema(nodes: XmlNode[]): Map<string, ElementSchema> {
  const schemas = new Map<string, ElementSchema>();
  const order: string[] = [];

  // Count per-parent occurrences
  const parentCounts = new Map<string, number>();
  for (const node of nodes) {
    parentCounts.set(node.name, (parentCounts.get(node.name) || 0) + 1);
  }

  // Group by name
  const groups = new Map<string, XmlNode[]>();
  for (const node of nodes) {
    if (!groups.has(node.name)) {
      groups.set(node.name, []);
      order.push(node.name);
    }
    groups.get(node.name)!.push(node);
  }

  for (const name of order) {
    const instances = groups.get(name)!;
    const existing = schemas.get(name);

    const schema: ElementSchema = existing || {
      name,
      count: 0,
      occurrenceCounts: [],
      attrs: new Map(),
      children: new Map(),
      childOrder: [],
      textValues: [],
      hasText: false,
      hasChildren: false,
    };

    schema.count += instances.length;
    schema.occurrenceCounts.push(parentCounts.get(name)!);

    for (const instance of instances) {
      // Merge attributes
      for (const [attrName, attrValue] of Object.entries(instance.attributes)) {
        if (isNamespaceAttr(attrName)) continue;
        if (!schema.attrs.has(attrName)) {
          schema.attrs.set(attrName, { name: attrName, values: new Set(), count: 0 });
        }
        const attrSchema = schema.attrs.get(attrName)!;
        attrSchema.values.add(attrValue);
        attrSchema.count++;
      }

      // Track text
      if (instance.text.trim()) {
        schema.hasText = true;
        schema.textValues.push(instance.text.trim());
      }

      // Track children
      if (instance.children.length > 0) {
        schema.hasChildren = true;
        const childSchemas = buildSchema(instance.children);
        for (const [childName, childSchema] of childSchemas) {
          if (schema.children.has(childName)) {
            mergeSchemas(schema.children.get(childName)!, childSchema);
          } else {
            schema.children.set(childName, childSchema);
            if (!schema.childOrder.includes(childName)) {
              schema.childOrder.push(childName);
            }
          }
        }
      }
    }

    // For children that don't appear in every instance, pad with 0 occurrences
    for (const child of schema.children.values()) {
      const expectedParents = instances.length;
      while (child.occurrenceCounts.length < expectedParents) {
        child.occurrenceCounts.push(0);
      }
    }

    schemas.set(name, schema);
  }

  return schemas;
}

function mergeSchemas(target: ElementSchema, source: ElementSchema): void {
  target.count += source.count;
  target.occurrenceCounts.push(...source.occurrenceCounts);

  for (const [attrName, attrSchema] of source.attrs) {
    if (target.attrs.has(attrName)) {
      const existing = target.attrs.get(attrName)!;
      for (const v of attrSchema.values) existing.values.add(v);
      existing.count += attrSchema.count;
    } else {
      target.attrs.set(attrName, { ...attrSchema, values: new Set(attrSchema.values) });
    }
  }

  if (source.hasText) {
    target.hasText = true;
    target.textValues.push(...source.textValues);
  }

  if (source.hasChildren) {
    target.hasChildren = true;
  }

  for (const [childName, childSchema] of source.children) {
    if (target.children.has(childName)) {
      mergeSchemas(target.children.get(childName)!, childSchema);
    } else {
      target.children.set(childName, childSchema);
      if (!target.childOrder.includes(childName)) {
        target.childOrder.push(childName);
      }
    }
  }
}

/**
 * Infer a simple type from text values.
 */
function inferType(values: string[]): string {
  if (values.length === 0) return "string";

  const isInteger = values.every((v) => /^-?\d+$/.test(v));
  if (isInteger) return "integer";

  const isDecimal = values.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (isDecimal) return "decimal";

  const isDate = values.every(
    (v) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(v),
  );
  if (isDate) return "date";

  const isBoolean = values.every((v) =>
    ["true", "false", "0", "1", "yes", "no"].includes(v.toLowerCase()),
  );
  if (isBoolean) return "boolean";

  return "string";
}

function formatAttrAnnotation(attr: AttrSchema, elementCount: number): string {
  const uniqueCount = attr.values.size;
  const values = Array.from(attr.values).sort();

  // If every element has a unique value, mark as unique
  if (uniqueCount === elementCount && uniqueCount > 1) {
    return `${attr.name}(unique)`;
  }

  // If small cardinality, show enum
  if (uniqueCount <= 10 && uniqueCount > 1) {
    return `${attr.name}(enum:${values.join("|")})`;
  }

  return attr.name;
}

interface SchemaJson {
  [key: string]: unknown;
}

function schemaToJson(schema: ElementSchema): SchemaJson {
  const result: SchemaJson = {};

  if (schema.count > 1) {
    result.count = schema.count;
  }

  if (schema.attrs.size > 0) {
    result.attrs = Array.from(schema.attrs.values()).map((a) =>
      formatAttrAnnotation(a, schema.count),
    );
  }

  if (schema.childOrder.length > 0) {
    result.children = schema.childOrder;
    for (const childName of schema.childOrder) {
      const child = schema.children.get(childName)!;
      result[childName] = schemaToJson(child);
    }
  }

  if (schema.hasText) {
    result.text = inferType(schema.textValues);
  }

  return result;
}

function xsdType(type: string): string {
  const map: Record<string, string> = {
    string: "xs:string",
    integer: "xs:integer",
    decimal: "xs:decimal",
    date: "xs:dateTime",
    boolean: "xs:boolean",
  };
  return map[type] || "xs:string";
}

function formatXsdAttrs(schema: ElementSchema, indent: string): string[] {
  const lines: string[] = [];
  for (const attr of schema.attrs.values()) {
    const use = attr.count >= schema.count ? "required" : "optional";
    const values = Array.from(attr.values).sort();
    if (values.length > 1 && values.length <= 10) {
      // Enum attribute
      lines.push(`${indent}<xs:attribute name="${attr.name}" use="${use}">`);
      lines.push(`${indent}  <xs:simpleType>`);
      lines.push(`${indent}    <xs:restriction base="xs:string">`);
      for (const v of values) {
        lines.push(`${indent}      <xs:enumeration value="${v}"/>`);
      }
      lines.push(`${indent}    </xs:restriction>`);
      lines.push(`${indent}  </xs:simpleType>`);
      lines.push(`${indent}</xs:attribute>`);
    } else {
      const type = values.length > 0 ? xsdType(inferType(values)) : "xs:string";
      lines.push(`${indent}<xs:attribute name="${attr.name}" type="${type}" use="${use}"/>`);
    }
  }
  return lines;
}

function formatXsdElement(schema: ElementSchema, indent: string): string[] {
  const lines: string[] = [];

  // Occurrence attributes
  const occParts: string[] = [];
  const minOcc = Math.min(...schema.occurrenceCounts);
  const maxOcc = Math.max(...schema.occurrenceCounts);
  if (minOcc === 0) {
    occParts.push('minOccurs="0"');
  }
  if (maxOcc > 1) {
    occParts.push('maxOccurs="unbounded"');
  }
  const occStr = occParts.length > 0 ? " " + occParts.join(" ") : "";

  const hasAttrs = schema.attrs.size > 0;
  const hasChildren = schema.childOrder.length > 0;
  const hasText = schema.hasText;

  // Simple text-only element with no attributes
  if (!hasChildren && !hasAttrs && hasText) {
    const type = xsdType(inferType(schema.textValues));
    lines.push(`${indent}<xs:element name="${schema.name}" type="${type}"${occStr}/>`);
    return lines;
  }

  // Empty element with no attributes
  if (!hasChildren && !hasAttrs && !hasText) {
    lines.push(`${indent}<xs:element name="${schema.name}"${occStr}/>`);
    return lines;
  }

  lines.push(`${indent}<xs:element name="${schema.name}"${occStr}>`);
  const inner = indent + "  ";

  if (hasChildren) {
    // Complex type with children
    const mixedAttr = hasText ? ' mixed="true"' : "";
    lines.push(`${inner}<xs:complexType${mixedAttr}>`);
    lines.push(`${inner}  <xs:sequence>`);
    for (const childName of schema.childOrder) {
      const child = schema.children.get(childName)!;
      lines.push(...formatXsdElement(child, inner + "    "));
    }
    lines.push(`${inner}  </xs:sequence>`);
    lines.push(...formatXsdAttrs(schema, inner + "  "));
    lines.push(`${inner}</xs:complexType>`);
  } else if (hasAttrs && hasText) {
    // Text + attributes → simpleContent extension
    const type = xsdType(inferType(schema.textValues));
    lines.push(`${inner}<xs:complexType>`);
    lines.push(`${inner}  <xs:simpleContent>`);
    lines.push(`${inner}    <xs:extension base="${type}">`);
    lines.push(...formatXsdAttrs(schema, inner + "      "));
    lines.push(`${inner}    </xs:extension>`);
    lines.push(`${inner}  </xs:simpleContent>`);
    lines.push(`${inner}</xs:complexType>`);
  } else if (hasAttrs && !hasText) {
    // Attributes only, no text, no children
    lines.push(`${inner}<xs:complexType>`);
    lines.push(...formatXsdAttrs(schema, inner + "  "));
    lines.push(`${inner}</xs:complexType>`);
  }

  lines.push(`${indent}</xs:element>`);
  return lines;
}

function formatXsd(schema: ElementSchema): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">');
  lines.push(...formatXsdElement(schema, "  "));
  lines.push("</xs:schema>");
  return lines.join("\n");
}

/**
 * Exported for testing.
 */
export async function runSchema(
  xml: string,
  options: { json?: boolean },
): Promise<void> {
  const { root } = parseXml(xml);

  // Build root schema
  const rootSchema: ElementSchema = {
    name: root.name,
    count: 1,
    occurrenceCounts: [1],
    attrs: new Map(),
    children: new Map(),
    childOrder: [],
    textValues: [],
    hasText: root.text.trim() !== "",
    hasChildren: root.children.length > 0,
  };

  // Root attributes (skip xmlns)
  for (const [attrName, attrValue] of Object.entries(root.attributes)) {
    if (isNamespaceAttr(attrName)) continue;
    rootSchema.attrs.set(attrName, { name: attrName, values: new Set([attrValue]), count: 1 });
  }

  if (root.text.trim()) {
    rootSchema.textValues.push(root.text.trim());
  }

  // Build child schemas
  const childSchemas = buildSchema(root.children);
  rootSchema.children = childSchemas;
  rootSchema.childOrder = Array.from(childSchemas.keys());

  if (options.json) {
    const jsonResult: SchemaJson = {};
    jsonResult[root.name] = schemaToJson(rootSchema);
    writeOutput(jsonResult, true);
  } else {
    writeOutput(formatXsd(rootSchema), false);
  }
}

export function register(program: Command): void {
  program
    .command("schema")
    .description("Infer an XSD schema from the document")
    .argument("[file]", "XML file path (reads from stdin if omitted)")
    .option("--json", "Output inferred schema as JSON")
    .action(
      async (
        file: string | undefined,
        options: { json?: boolean },
      ) => {
        try {
          const xml = await readInput(file);
          await runSchema(xml, options);
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
