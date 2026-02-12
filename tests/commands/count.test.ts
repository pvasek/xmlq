import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runSelect } from "../../src/commands/select.js";

const sampleXml = `<root>
  <item id="1"><name>Alpha</name></item>
  <item id="2"><name>Beta</name></item>
  <item id="3"><name>Gamma</name></item>
</root>`;

describe("count command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs the count as a plain number", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//item", { count: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("3");
  });

  it("outputs 0 when no matches", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, "//nonexistent", { count: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("0");
  });

  it("outputs correct count for filtered queries", async () => {
    const cap = captureOutput();
    try {
      await runSelect(sampleXml, '//item[@id="2"]', { count: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout.trim()).toBe("1");
  });
});
