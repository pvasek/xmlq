import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runStat } from "../../src/commands/stat.js";

describe("stat command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows root element name", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root><child/></root>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Root:");
    expect(result.stdout).toContain("<root>");
  });

  it("counts elements correctly", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root><a/><b/><c/></root>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Elements:");
    expect(result.stdout).toContain("4");
  });

  it("calculates max depth", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root><a><b><c/></b></a></root>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Max depth:");
    expect(result.stdout).toContain("4");
  });

  it("detects namespaces", async () => {
    const cap = captureOutput();
    try {
      await runStat(
        '<root xmlns="http://example.com" xmlns:ns="http://ns.com"><ns:child/></root>',
        undefined,
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Namespaces:");
    expect(result.stdout).toContain("http://example.com");
    expect(result.stdout).toContain("http://ns.com");
  });

  it("shows top-level children with counts", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root><item/><item/><other/></root>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Top-level:");
    expect(result.stdout).toContain("<item> x 2");
    expect(result.stdout).toContain("<other> x 1");
  });

  it("shows stdin when no file path", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root/>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("(stdin)");
  });

  it("shows file name when provided", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root/>", "test.xml", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("test.xml");
  });

  it("outputs JSON when --json flag is set", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root><child/></root>", undefined, { json: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(json.root).toBe("root");
    expect(json.elements).toBe(2);
    expect(json.maxDepth).toBe(2);
  });

  it("shows xmlns in root tag display", async () => {
    const cap = captureOutput();
    try {
      await runStat('<root xmlns="http://example.com"/>', undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('<root xmlns="http://example.com">');
  });

  it("handles single-element doc", async () => {
    const cap = captureOutput();
    try {
      await runStat("<root/>", undefined, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Elements:");
    expect(result.stdout).toContain("1");
    expect(result.stdout).toContain("Max depth:");
  });
});
