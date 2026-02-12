import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runFmt } from "../../src/commands/fmt.js";

const uglyXml = `<root><child attr="val"><nested>text</nested></child><other/></root>`;

describe("fmt command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pretty-prints XML with default 2-space indent", async () => {
    const cap = captureOutput();
    try {
      await runFmt(uglyXml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.split("\n");
    // Root should not be indented
    expect(lines[0]).toMatch(/^<root>/);
    // Child should be indented 2 spaces
    expect(lines[1]).toMatch(/^  <child/);
    // Nested should be indented 4 spaces
    expect(lines[2]).toMatch(/^    <nested/);
  });

  it("pretty-prints with custom indent", async () => {
    const cap = captureOutput();
    try {
      await runFmt(uglyXml, { indent: 4 });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const lines = result.stdout.split("\n");
    expect(lines[1]).toMatch(/^    <child/);
  });

  it("--compact minifies XML", async () => {
    const prettyXml = `<root>
  <child attr="val">
    <nested>text</nested>
  </child>
  <other/>
</root>`;
    const cap = captureOutput();
    try {
      await runFmt(prettyXml, { compact: true });
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Compact output should have no newlines between tags (or minimal)
    expect(result.stdout).toContain("<root>");
    expect(result.stdout).toContain("<child");
    expect(result.stdout).not.toMatch(/>\n  </);
  });

  it("preserves attributes", async () => {
    const cap = captureOutput();
    try {
      await runFmt('<root id="1" class="main"><item/></root>', {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain('id="1"');
    expect(result.stdout).toContain('class="main"');
  });

  it("preserves text content", async () => {
    const cap = captureOutput();
    try {
      await runFmt("<root><name>Hello World</name></root>", {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("Hello World");
  });

  it("handles self-closing tags", async () => {
    const cap = captureOutput();
    try {
      await runFmt('<root><empty/><also-empty attr="v"/></root>', {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("<empty/>");
    expect(result.stdout).toContain("<also-empty");
  });

  it("handles XML declaration", async () => {
    const xmlWithDecl = '<?xml version="1.0" encoding="UTF-8"?><root><child/></root>';
    const cap = captureOutput();
    try {
      await runFmt(xmlWithDecl, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("<?xml");
    expect(result.stdout).toContain("<root>");
  });

  it("produces valid XML output", async () => {
    const xml = '<root><a id="1"><b>text</b></a><c/></root>';
    const cap = captureOutput();
    try {
      await runFmt(xml, {});
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Should still be valid XML — contains opening and closing root
    expect(result.stdout).toContain("<root>");
    expect(result.stdout).toContain("</root>");
  });
});
