import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runAttrs } from "../../src/commands/attrs.js";

const sampleXml = `<root>
  <product sku="A-001" category="electronics">
    <name>Widget</name>
    <price currency="USD">10</price>
  </product>
  <product sku="A-002" category="electronics">
    <name>Gadget</name>
    <price currency="EUR">20</price>
  </product>
  <product sku="A-003" category="books">
    <name>Book</name>
    <price currency="USD">5</price>
  </product>
</root>`;

describe("attrs command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("without xpath (full document discovery)", () => {
    it("discovers all attributes across the document", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, undefined, {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).toContain("product/@sku");
      expect(result.stdout).toContain("product/@category");
      expect(result.stdout).toContain("price/@currency");
    });

    it("shows unique value counts", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, undefined, {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).toContain("3 unique values");
    });

    it("shows inline values for small-cardinality attributes (<=10)", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, undefined, {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      // currency has 2 unique values (sorted: EUR, USD) — should show inline
      expect(result.stdout).toMatch(/currency.*\[.*EUR.*USD.*\]/s);
      // category has 2 values (sorted: books, electronics)
      expect(result.stdout).toMatch(/category.*\[.*books.*electronics.*\]/s);
    });

    it("excludes xmlns attributes from discovery", async () => {
      const xml = '<root xmlns="http://example.com" xmlns:ns="http://ns.com"><item id="1"/></root>';
      const cap = captureOutput();
      try {
        await runAttrs(xml, undefined, {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).not.toContain("xmlns");
      expect(result.stdout).toContain("item/@id");
    });
  });

  describe("with xpath", () => {
    it("lists attributes of matched elements", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, "//product", {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).toContain("@sku");
      expect(result.stdout).toContain("@category");
    });

    it("shows values for matched element attributes", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, "//price", {});
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).toContain("@currency");
      expect(result.stdout).toContain("USD");
      expect(result.stdout).toContain("EUR");
    });
  });

  describe("--values flag", () => {
    it("lists all unique values per attribute", async () => {
      const cap = captureOutput();
      try {
        await runAttrs(sampleXml, "//product", { values: true });
      } catch {}
      const result = cap.getOutput();
      cap.restore();
      expect(result.stdout).toContain("A-001");
      expect(result.stdout).toContain("A-002");
      expect(result.stdout).toContain("A-003");
    });
  });

  it("handles elements with no attributes", async () => {
    const xml = "<root><item>text</item></root>";
    const cap = captureOutput();
    try {
      await runAttrs(xml, undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("");
  });

  it("outputs JSON when --json flag is set", async () => {
    const cap = captureOutput();
    try {
      await runAttrs(sampleXml, undefined, { json: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty("path");
    expect(json[0]).toHaveProperty("uniqueCount");
    expect(json[0]).toHaveProperty("values");
  });
});
