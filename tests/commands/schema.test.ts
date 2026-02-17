import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runSchema } from "../../src/commands/schema.js";

const sampleXml = `<catalog>
  <category id="cat-1">
    <name>Electronics</name>
    <description>Electronic gadgets</description>
  </category>
  <category id="cat-2">
    <name>Books</name>
    <description>Reading material</description>
  </category>
  <product sku="A-001" category-ref="cat-1">
    <name>Widget Pro</name>
    <price currency="USD">149.99</price>
    <tags><tag>premium</tag><tag>new</tag></tags>
  </product>
  <product sku="A-002" category-ref="cat-1">
    <name>Widget Basic</name>
    <price currency="EUR">49.99</price>
    <tags><tag>budget</tag></tags>
  </product>
  <product sku="A-003" category-ref="cat-2">
    <name>Novel</name>
    <price currency="USD">12.99</price>
  </product>
</catalog>`;

describe("schema command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs valid XSD structure", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result.stdout).toContain('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">');
    expect(result.stdout).toContain("</xs:schema>");
  });

  it("shows element names as xs:element", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('xs:element name="catalog"');
    expect(result.stdout).toContain('xs:element name="category"');
    expect(result.stdout).toContain('xs:element name="product"');
    expect(result.stdout).toContain('xs:element name="price"');
    expect(result.stdout).toContain('xs:element name="tag"');
  });

  it("uses maxOccurs=unbounded for repeated elements", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // product appears 3 times
    expect(result.stdout).toMatch(/xs:element name="product"[^>]*maxOccurs="unbounded"/);
    // category appears 2 times
    expect(result.stdout).toMatch(/xs:element name="category"[^>]*maxOccurs="unbounded"/);
  });

  it("shows attributes as xs:attribute", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('xs:attribute name="sku"');
    expect(result.stdout).toContain('xs:attribute name="category-ref"');
    expect(result.stdout).toContain('xs:attribute name="currency"');
    expect(result.stdout).toContain('xs:attribute name="id"');
  });

  it("generates complexType with xs:sequence for elements with children", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("<xs:complexType>");
    expect(result.stdout).toContain("<xs:sequence>");
  });

  it("generates enum restrictions for small-cardinality attributes", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // currency has 2 values: EUR, USD
    expect(result.stdout).toContain('<xs:enumeration value="EUR"/>');
    expect(result.stdout).toContain('<xs:enumeration value="USD"/>');
  });

  it("infers XSD types from text content", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // price has decimal text → xs:decimal base in simpleContent extension
    expect(result.stdout).toContain('xs:extension base="xs:decimal"');
    // name is simple text → type="xs:string"
    expect(result.stdout).toMatch(/xs:element name="name" type="xs:string"/);
  });

  it("uses minOccurs=0 for variably-present children", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // tags is present on 2 of 3 products, so minOccurs="0"
    expect(result.stdout).toMatch(/xs:element name="tags"[^>]*minOccurs="0"/);
  });

  it("uses maxOccurs=unbounded for variable child counts", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // tag appears 1..2 times across parents
    expect(result.stdout).toMatch(/xs:element name="tag"[^>]*maxOccurs="unbounded"/);
  });

  it("outputs JSON when --json flag is set", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, { json: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json).toHaveProperty("catalog");
  });

  it("handles simple XML", async () => {
    const cap = captureOutput();
    try {
      await runSchema("<root><item>text</item></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('xs:element name="root"');
    expect(result.stdout).toContain('xs:element name="item"');
  });

  it("generates simpleContent extension for text+attrs elements", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // price has text + currency attr → simpleContent > extension
    expect(result.stdout).toContain("<xs:simpleContent>");
    expect(result.stdout).toContain("</xs:simpleContent>");
  });
});
