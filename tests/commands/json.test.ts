import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runJson } from "../../src/commands/json.js";

describe("json command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("converts simple XML to JSON", async () => {
    const cap = captureOutput();
    try {
      await runJson("<root><name>Hello</name><value>42</value></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json.name).toBe("Hello");
    expect(json.value).toBe("42");
  });

  it("converts attributes as @-prefixed keys", async () => {
    const cap = captureOutput();
    try {
      await runJson('<item id="1" type="a"><name>Test</name></item>', {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json["@id"]).toBe("1");
    expect(json["@type"]).toBe("a");
    expect(json.name).toBe("Test");
  });

  it("groups repeated elements into arrays", async () => {
    const cap = captureOutput();
    try {
      await runJson(
        "<root><item>A</item><item>B</item><item>C</item></root>",
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json.item)).toBe(true);
    expect(json.item).toEqual(["A", "B", "C"]);
  });

  it("handles nested elements", async () => {
    const xml = `<catalog>
      <product><name>Widget</name><price>10</price></product>
    </catalog>`;
    const cap = captureOutput();
    try {
      await runJson(xml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json.product.name).toBe("Widget");
    expect(json.product.price).toBe("10");
  });

  it("outputs pretty JSON by default", async () => {
    const cap = captureOutput();
    try {
      await runJson("<root><a>1</a></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Pretty JSON has newlines and indentation
    expect(result.stdout).toContain("\n");
    expect(result.stdout).toMatch(/^\{/);
  });

  it("--compact produces minified JSON", async () => {
    const cap = captureOutput();
    try {
      await runJson("<root><a>1</a><b>2</b></root>", { compact: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Should be a single line (no pretty indentation)
    const trimmed = result.stdout.trim();
    expect(trimmed).not.toContain("\n");
    const json = JSON.parse(trimmed);
    expect(json.a).toBe("1");
    expect(json.b).toBe("2");
  });

  it("handles empty elements", async () => {
    const cap = captureOutput();
    try {
      await runJson("<root><empty/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json).toHaveProperty("empty");
  });

  it("handles XML with declaration", async () => {
    const cap = captureOutput();
    try {
      await runJson(
        '<?xml version="1.0"?><root><item>test</item></root>',
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json.item).toBe("test");
  });
});
