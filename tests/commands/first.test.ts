import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runFirst } from "../../src/commands/first.js";

const sampleXml = `<root>
  <item id="1"><name>Alpha</name></item>
  <item id="2"><name>Beta</name></item>
  <item id="3"><name>Gamma</name></item>
</root>`;

describe("first command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 1 match by default (xpath only)", async () => {
    const cap = captureOutput();
    try {
      await runFirst(sampleXml, "//item", undefined, undefined);
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).not.toContain("Beta");
  });

  it("explicit N: first 2 matches", async () => {
    const cap = captureOutput();
    try {
      await runFirst(sampleXml, "2", "//item", undefined);
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).toContain("Beta");
    expect(result.stdout).not.toContain("Gamma");
  });

  it("disambiguates: number-like first arg treated as N", async () => {
    const cap = captureOutput();
    try {
      await runFirst(sampleXml, "3", "//item", undefined);
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).toContain("Beta");
    expect(result.stdout).toContain("Gamma");
  });

  it("disambiguates: non-number first arg treated as xpath", async () => {
    const cap = captureOutput();
    try {
      await runFirst(sampleXml, "//name", undefined, undefined);
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).not.toContain("Beta");
  });

  it("returns empty when no matches", async () => {
    const cap = captureOutput();
    try {
      await runFirst(sampleXml, "//nonexistent", undefined, undefined);
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toBe("");
  });
});
