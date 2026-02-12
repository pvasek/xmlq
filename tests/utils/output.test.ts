import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeOutput, writeError, isTTY } from "../../src/utils/output.js";

describe("writeOutput", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes JSON when asJson is true", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    writeOutput({ foo: "bar" }, true);
    expect(spy).toHaveBeenCalledWith('{\n  "foo": "bar"\n}\n');
  });

  it("writes plain string with trailing newline", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    writeOutput("hello", false);
    expect(spy).toHaveBeenCalledWith("hello\n");
  });

  it("does not double-add newline if string already ends with one", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    writeOutput("hello\n", false);
    expect(spy).toHaveBeenCalledWith("hello\n");
  });

  it("converts non-string data to string", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    writeOutput(42, false);
    expect(spy).toHaveBeenCalledWith("42\n");
  });
});

describe("writeError", () => {
  it("writes to stderr with Error: prefix", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    writeError("something went wrong");
    expect(spy).toHaveBeenCalledWith("Error: something went wrong\n");
  });
});

describe("isTTY", () => {
  it("returns a boolean", () => {
    expect(typeof isTTY()).toBe("boolean");
  });
});
