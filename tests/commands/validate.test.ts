import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";

// We test by importing the action logic directly, not via commander
import { readInput } from "../../src/utils/input.js";
import { validateXml } from "../../src/utils/parse.js";
import { writeOutput, writeError } from "../../src/utils/output.js";

// Helper that mirrors the validate command action
async function runValidate(xml: string) {
  const cap = captureOutput();
  try {
    const validation = validateXml(xml);
    if (validation.valid) {
      writeOutput("OK: well-formed XML", false);
    } else {
      const err = validation.error!;
      writeError(`line ${err.line}, col ${err.col}: ${err.message}`);
      process.exit(1);
    }
  } catch (e) {
    // process.exit throws in our mock
  }
  const result = cap.getOutput();
  cap.restore();
  return result;
}

describe("validate command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prints OK for valid XML", async () => {
    const result = await runValidate("<root><child/></root>");
    expect(result.stdout).toContain("OK: well-formed XML");
    expect(result.exitCode).toBeUndefined(); // no exit call = success (0)
  });

  it("prints error for unclosed tag and exits 1", async () => {
    const result = await runValidate("<root><child></root>");
    expect(result.stderr).toContain("Error:");
    expect(result.exitCode).toBe(1);
  });

  it("prints error for mismatched tags and exits 1", async () => {
    const result = await runValidate("<root><a></b></root>");
    expect(result.stderr).toContain("Error:");
    expect(result.exitCode).toBe(1);
  });

  it("prints error for empty input and exits 1", async () => {
    const result = await runValidate("");
    expect(result.stderr).toContain("Error:");
    expect(result.exitCode).toBe(1);
  });

  it("accepts XML with declaration", async () => {
    const result = await runValidate('<?xml version="1.0"?><root/>');
    expect(result.stdout).toContain("OK: well-formed XML");
    expect(result.exitCode).toBeUndefined();
  });

  it("includes line/col info in error message", async () => {
    const result = await runValidate("<root><child></root>");
    expect(result.stderr).toMatch(/line \d+/);
    expect(result.stderr).toMatch(/col \d+/);
  });
});
