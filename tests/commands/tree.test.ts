import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runTree } from "../../src/commands/tree.js";

describe("tree command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows single root element", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root/>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("root");
  });

  it("shows nested structure with box-drawing", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><a/><b/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines[0]).toBe("root");
    expect(lines[1]).toContain("├──");
    expect(lines[1]).toContain("a");
    expect(lines[2]).toContain("└──");
    expect(lines[2]).toContain("b");
  });

  it("shows deeper nesting with proper continuations", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><a><c/></a><b/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines[0]).toBe("root");
    expect(lines[1]).toContain("├── a");
    expect(lines[2]).toContain("│   └── c");
    expect(lines[3]).toContain("└── b");
  });

  it("shows attributes as @attr", async () => {
    const cap = captureOutput();
    try {
      await runTree('<root><item id="1"/></root>', {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("@id");
  });

  it("hides attributes with --no-attrs", async () => {
    const cap = captureOutput();
    try {
      await runTree('<root><item id="1"/></root>', { attrs: false });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).not.toContain("@id");
  });

  it("shows repetition counts for uniform siblings", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><item/><item/><item/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("item");
    expect(result.stdout).toContain("(x3)");
  });

  it("shows range notation for varying counts", async () => {
    const cap = captureOutput();
    try {
      await runTree(
        "<root><parent><child/></parent><parent><child/><child/><child/></parent></root>",
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("child");
    expect(result.stdout).toContain("(x1..3)");
  });

  it("hides counts with --no-counts", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><item/><item/><item/></root>", { counts: false });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).not.toContain("(x3)");
  });

  it("shows #text for mixed content", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><item>text<sub/>more</item></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("#text");
  });

  it("does NOT show #text for text-only elements", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><name>hello</name></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).not.toContain("#text");
  });

  it("limits depth with --depth", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><a><b><c/></b></a></root>", { depth: 2 });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("root");
    expect(result.stdout).toContain("a");
    expect(result.stdout).not.toContain("b");
  });

  it("excludes xmlns attributes from display", async () => {
    const cap = captureOutput();
    try {
      await runTree(
        '<root xmlns="http://example.com" id="1"><child/></root>',
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("@id");
    expect(result.stdout).not.toContain("@xmlns");
  });

  it("merges structure across multiple same-name siblings", async () => {
    const cap = captureOutput();
    try {
      await runTree(
        '<root><item><a/></item><item><b/></item></root>',
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Both a and b should appear under item
    expect(result.stdout).toContain("item");
    expect(result.stdout).toContain("a");
    expect(result.stdout).toContain("b");
  });

  it("does not show count when always 1", async () => {
    const cap = captureOutput();
    try {
      await runTree("<root><a/><b/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).not.toContain("(x1)");
    expect(result.stdout).not.toMatch(/\(x\d/);
  });
});
