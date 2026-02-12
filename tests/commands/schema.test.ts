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

  it("shows element names in schema", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("catalog");
    expect(result.stdout).toContain("category");
    expect(result.stdout).toContain("product");
    expect(result.stdout).toContain("price");
    expect(result.stdout).toContain("tag");
  });

  it("shows element counts", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // product appears 3 times
    expect(result.stdout).toMatch(/product[\s\S]*count:\s*3/);
    // category appears 2 times
    expect(result.stdout).toMatch(/category[\s\S]*count:\s*2/);
  });

  it("shows attributes", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("sku");
    expect(result.stdout).toContain("category-ref");
    expect(result.stdout).toContain("currency");
    expect(result.stdout).toContain("id");
  });

  it("shows children lists", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("children:");
    expect(result.stdout).toContain("name");
    expect(result.stdout).toContain("price");
  });

  it("marks unique attributes", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // sku has 3 unique values for 3 products — unique
    expect(result.stdout).toMatch(/sku\(unique\)/);
  });

  it("shows enum values for small-cardinality attributes", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // currency has 2 values: USD, EUR
    expect(result.stdout).toMatch(/currency\(enum:.*EUR.*USD.*\)/);
  });

  it("infers text types", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // price text should be detected as decimal
    expect(result.stdout).toMatch(/price[\s\S]*text:\s*decimal/);
    // name should be string
    expect(result.stdout).toMatch(/name[\s\S]*text:\s*string/);
  });

  it("shows variable child count ranges", async () => {
    const cap = captureOutput();
    try {
      await runSchema(sampleXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // tag appears 1..2 times across different parents
    expect(result.stdout).toMatch(/tag[\s\S]*count:\s*1\.\.2/);
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
    expect(result.stdout).toContain("root");
    expect(result.stdout).toContain("item");
  });
});
