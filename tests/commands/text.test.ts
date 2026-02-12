import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runText } from "../../src/commands/text.js";

const sampleXml = `<root>
  <item><name>  Alpha  </name></item>
  <item><name>  Beta  </name></item>
  <item><name>  Gamma  </name></item>
</root>`;

describe("text command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts text content, one per line", async () => {
    const cap = captureOutput();
    try {
      await runText(sampleXml, "//name", { trim: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("--trim (default) trims whitespace", async () => {
    const cap = captureOutput();
    try {
      await runText(sampleXml, "//name", { trim: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).not.toContain("  Alpha  ");
  });

  it("--no-trim preserves whitespace", async () => {
    const cap = captureOutput();
    try {
      await runText(sampleXml, "//name", { trim: false });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("  Alpha  ");
  });

  it("--first N limits output", async () => {
    const cap = captureOutput();
    try {
      await runText(sampleXml, "//name", { trim: true, first: 2 });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines).toEqual(["Alpha", "Beta"]);
  });

  it("empty text nodes produce empty lines", async () => {
    const xml = "<root><a/><a>text</a></root>";
    const cap = captureOutput();
    try {
      await runText(xml, "//a", { trim: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.split("\n").filter((_, i, arr) => i < arr.length - 1 || _ !== "");
    // First <a/> has empty text, second has "text"
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("text");
  });
});
