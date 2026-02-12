import { describe, it, expect } from "vitest";
import { validateXml, parseXml } from "../../src/utils/parse.js";

describe("validateXml", () => {
  it("returns valid for well-formed XML", () => {
    const result = validateXml("<root><child/></root>");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid for unclosed tag", () => {
    const result = validateXml("<root><child></root>");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toBeTruthy();
  });

  it("returns invalid for mismatched tags", () => {
    const result = validateXml("<root><a></b></root>");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns invalid for empty input", () => {
    const result = validateXml("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts XML with declaration", () => {
    const result = validateXml('<?xml version="1.0"?><root/>');
    expect(result.valid).toBe(true);
  });

  it("accepts XML with CDATA", () => {
    const result = validateXml("<root><![CDATA[some <data>]]></root>");
    expect(result.valid).toBe(true);
  });

  it("accepts XML with namespaces", () => {
    const result = validateXml('<root xmlns:ns="http://example.com"><ns:child/></root>');
    expect(result.valid).toBe(true);
  });

  it("accepts XML with attributes", () => {
    const result = validateXml('<root id="1" name="test"/>');
    expect(result.valid).toBe(true);
  });
});

describe("parseXml", () => {
  it("parses a simple element", () => {
    const result = parseXml("<root/>");
    expect(result.root.name).toBe("root");
    expect(result.root.children).toHaveLength(0);
    expect(result.root.attributes).toEqual({});
  });

  it("parses nested elements", () => {
    const result = parseXml("<root><a><b/></a></root>");
    expect(result.root.name).toBe("root");
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].name).toBe("a");
    expect(result.root.children[0].children).toHaveLength(1);
    expect(result.root.children[0].children[0].name).toBe("b");
  });

  it("parses attributes", () => {
    const result = parseXml('<root id="1" name="test"/>');
    expect(result.root.attributes).toEqual({ id: "1", name: "test" });
  });

  it("parses text content", () => {
    const result = parseXml("<root>hello</root>");
    expect(result.root.text).toBe("hello");
  });

  it("parses multiple same-name siblings", () => {
    const result = parseXml("<root><item/><item/><item/></root>");
    expect(result.root.children).toHaveLength(3);
    expect(result.root.children.every((c) => c.name === "item")).toBe(true);
  });

  it("parses mixed content (text + children)", () => {
    const result = parseXml("<root>before<child/>after</root>");
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].name).toBe("child");
    expect(result.root.text).toContain("before");
    expect(result.root.text).toContain("after");
  });

  it("parses namespaced attributes", () => {
    const result = parseXml('<root xmlns="http://example.com" xmlns:ns="http://ns.com"/>');
    expect(result.root.attributes["xmlns"]).toBe("http://example.com");
    expect(result.root.attributes["xmlns:ns"]).toBe("http://ns.com");
  });

  it("preserves rawXml", () => {
    const xml = "<root><child/></root>";
    const result = parseXml(xml);
    expect(result.rawXml).toBe(xml);
  });

  it("throws on invalid XML", () => {
    expect(() => parseXml("<root><unclosed>")).toThrow();
  });

  it("parses CDATA content as text", () => {
    const result = parseXml("<root><![CDATA[hello world]]></root>");
    expect(result.root.text).toContain("hello world");
  });

  it("parses XML with declaration", () => {
    const result = parseXml('<?xml version="1.0"?><root/>');
    expect(result.root.name).toBe("root");
  });
});
