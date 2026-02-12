import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runTags } from "../../src/commands/tags.js";

describe("tags command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("counts occurrences of each tag", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><a/><a/><b/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("a");
    expect(result.stdout).toContain("b");
    expect(result.stdout).toContain("root");
  });

  it("sorts by count descending by default", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><a/><a/><b/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    // a=2 should come before b=1 and root=1
    const aIdx = lines.findIndex((l) => l.includes("a"));
    const rootIdx = lines.findIndex((l) => l.includes("root"));
    expect(aIdx).toBeLessThan(rootIdx);
  });

  it("sorts alphabetically with --sort name", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><c/><a/><b/></root>", { sort: "name" });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    const names = lines.map((l) => l.trim().split(/\s+/).pop()!);
    expect(names).toEqual(["a", "b", "c", "root"]);
  });

  it("breaks ties alphabetically when sorting by count", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><b/><a/></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    // all have count 1, so alphabetical: a, b, root
    const names = lines.map((l) => l.trim().split(/\s+/).pop()!);
    expect(names).toEqual(["a", "b", "root"]);
  });

  it("filters by depth", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><a><b/></a></root>", { depth: 2 });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // depth 1 = root, depth 2 = a, depth 3 = b (excluded)
    expect(result.stdout).toContain("root");
    expect(result.stdout).toContain("a");
    expect(result.stdout).not.toContain("b");
  });

  it("outputs JSON with --json", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root><a/><a/><b/></root>", { json: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json)).toBe(true);
    const aEntry = json.find((e: { name: string }) => e.name === "a");
    expect(aEntry.count).toBe(2);
  });

  it("right-aligns counts", async () => {
    const cap = captureOutput();
    try {
      await runTags(
        "<root><a/><a/><a/><a/><a/><a/><a/><a/><a/><a/><b/></root>",
        {},
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    // "10" should have leading spaces matching "10" width, "1" should be padded
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    // Count column should be same width
    const firstNum = firstLine.match(/^\s*(\d+)/)?.[0];
    const lastNum = lastLine.match(/^\s*(\d+)/)?.[0];
    expect(firstNum?.length).toBe(lastNum?.length);
  });

  it("handles single element", async () => {
    const cap = captureOutput();
    try {
      await runTags("<root/>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("root");
    expect(result.stdout).toContain("1");
  });
});
