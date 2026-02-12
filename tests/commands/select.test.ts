import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runSelect } from "../../src/commands/select.js";

const sampleXml = `<root>
  <item id="1"><name>Alpha</name><value>10</value></item>
  <item id="2"><name>Beta</name><value>20</value></item>
  <item id="3"><name>Gamma</name><value>30</value></item>
</root>`;

describe("select command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("selects elements by XPath", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("<item");
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).toContain("Beta");
    expect(result.stdout).toContain("Gamma");
  });

  it("supports attribute predicates", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, '//item[@id="1"]', {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).not.toContain("Beta");
  });

  it("--first N limits results", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { first: 2 });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Alpha");
    expect(result.stdout).toContain("Beta");
    expect(result.stdout).not.toContain("Gamma");
  });

  it("--count outputs number of matches", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { count: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("3");
  });

  it("--text outputs text content", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//name", { text: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("--attr NAME outputs attribute values", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { attr: "id" });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.trim().split("\n");
    expect(lines).toEqual(["1", "2", "3"]);
  });

  it("--json outputs JSON", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { first: 1, json: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]["@id"]).toBe("1");
    expect(json[0]["name"]).toBe("Alpha");
  });

  it("--wrap wraps output in <results>", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//name", { wrap: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("<results>");
    expect(result.stdout).toContain("</results>");
  });

  it("--compact uses compact serialization", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { first: 1, compact: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Compact output should not have indented lines
    expect(result.stdout).toContain("<item");
    expect(result.stdout).toContain("</item>");
    // No leading whitespace before child elements
    expect(result.stdout).not.toMatch(/\n  <name>/);
  });

  it("no matches produces empty output", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//nonexistent", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toBe("");
  });

  it("invalid XPath errors on stderr with exit 1", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "///invalid[[[", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stderr).toContain("Error:");
    expect(result.exitCode).toBe(1);
  });
});
