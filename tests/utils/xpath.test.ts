import { describe, it, expect } from "vitest";
import {
  parseDom,
  selectNodes,
  serializeNode,
  serializeNodeCompact,
  nodeToJson,
  parseNamespaces,
} from "../../src/utils/xpath.js";

describe("parseDom", () => {
  it("parses valid XML into a Document", () => {
    const doc = parseDom("<root><child/></root>");
    expect(doc).toBeTruthy();
    expect(doc.documentElement.tagName).toBe("root");
  });

  it("throws on malformed XML", () => {
    expect(() => parseDom("<root><unclosed>")).toThrow();
  });

  it("handles attributes", () => {
    const doc = parseDom('<root id="1" name="test"/>');
    expect(doc.documentElement.getAttribute("id")).toBe("1");
    expect(doc.documentElement.getAttribute("name")).toBe("test");
  });
});

describe("selectNodes", () => {
  it("selects matching elements", () => {
    const doc = parseDom("<root><a/><b/><a/></root>");
    const nodes = selectNodes(doc, "//a");
    expect(nodes).toHaveLength(2);
  });

  it("returns empty array for no matches", () => {
    const doc = parseDom("<root><a/></root>");
    const nodes = selectNodes(doc, "//z");
    expect(nodes).toHaveLength(0);
  });

  it("supports attribute predicates", () => {
    const doc = parseDom(
      '<root><item id="1"/><item id="2"/><item id="1"/></root>',
    );
    const nodes = selectNodes(doc, '//item[@id="1"]');
    expect(nodes).toHaveLength(2);
  });

  it("throws on invalid XPath", () => {
    const doc = parseDom("<root/>");
    expect(() => selectNodes(doc, "///invalid[[[")).toThrow(/Invalid XPath/);
  });

  it("works with namespace-aware queries", () => {
    const xml =
      '<root xmlns:ns="http://example.com"><ns:child>hello</ns:child></root>';
    const doc = parseDom(xml);
    const nodes = selectNodes(doc, "//ns:child", {
      ns: "http://example.com",
    });
    expect(nodes).toHaveLength(1);
  });
});

describe("serializeNode", () => {
  it("serializes an element with children", () => {
    const doc = parseDom("<root><child>text</child></root>");
    const nodes = selectNodes(doc, "//root");
    const result = serializeNode(nodes[0]);
    expect(result).toContain("<root>");
    expect(result).toContain("<child>text</child>");
    expect(result).toContain("</root>");
  });

  it("serializes self-closing empty elements", () => {
    const doc = parseDom("<root><empty/></root>");
    const nodes = selectNodes(doc, "//empty");
    const result = serializeNode(nodes[0]);
    expect(result).toBe("<empty/>");
  });

  it("serializes attributes", () => {
    const doc = parseDom('<root><item id="1" name="test"/></root>');
    const nodes = selectNodes(doc, "//item");
    const result = serializeNode(nodes[0]);
    expect(result).toContain('id="1"');
    expect(result).toContain('name="test"');
  });

  it("indents nested elements", () => {
    const doc = parseDom("<root><a><b>text</b></a></root>");
    const nodes = selectNodes(doc, "//root");
    const result = serializeNode(nodes[0], 2);
    const lines = result.split("\n");
    expect(lines[0]).toBe("<root>");
    expect(lines[1]).toBe("  <a>");
    expect(lines[2]).toBe("    <b>text</b>");
    expect(lines[3]).toBe("  </a>");
    expect(lines[4]).toBe("</root>");
  });
});

describe("serializeNodeCompact", () => {
  it("produces compact XML output", () => {
    const doc = parseDom("<root><child>text</child></root>");
    const nodes = selectNodes(doc, "//root");
    const result = serializeNodeCompact(nodes[0]);
    expect(result).toBe("<root><child>text</child></root>");
  });
});

describe("nodeToJson", () => {
  it("converts a leaf element to its text content", () => {
    const doc = parseDom("<root><name>hello</name></root>");
    const nodes = selectNodes(doc, "//name");
    expect(nodeToJson(nodes[0])).toBe("hello");
  });

  it("includes attributes as @-prefixed keys", () => {
    const doc = parseDom('<root><item id="1">text</item></root>');
    const nodes = selectNodes(doc, "//item");
    const result = nodeToJson(nodes[0]) as Record<string, unknown>;
    expect(result["@id"]).toBe("1");
    expect(result["#text"]).toBe("text");
  });

  it("groups children by tag name", () => {
    const doc = parseDom(
      "<root><a>1</a><a>2</a><b>3</b></root>",
    );
    const nodes = selectNodes(doc, "//root");
    const result = nodeToJson(nodes[0]) as Record<string, unknown>;
    expect(result["a"]).toEqual(["1", "2"]);
    expect(result["b"]).toBe("3");
  });

  it("returns empty string for empty leaf", () => {
    const doc = parseDom("<root><empty/></root>");
    const nodes = selectNodes(doc, "//empty");
    expect(nodeToJson(nodes[0])).toBe("");
  });
});

describe("parseNamespaces", () => {
  it("parses a single namespace mapping", () => {
    const result = parseNamespaces("ns=http://example.com");
    expect(result).toEqual({ ns: "http://example.com" });
  });

  it("parses multiple namespace mappings", () => {
    const result = parseNamespaces([
      "ns=http://example.com",
      "other=http://other.com",
    ]);
    expect(result).toEqual({
      ns: "http://example.com",
      other: "http://other.com",
    });
  });

  it("returns empty object for undefined", () => {
    expect(parseNamespaces(undefined)).toEqual({});
  });

  it("throws on missing equals sign", () => {
    expect(() => parseNamespaces("invalid")).toThrow(
      /Invalid namespace mapping/,
    );
  });

  it("throws on empty prefix or URI", () => {
    expect(() => parseNamespaces("=http://example.com")).toThrow(
      /Invalid namespace mapping/,
    );
    expect(() => parseNamespaces("ns=")).toThrow(/Invalid namespace mapping/);
  });
});
