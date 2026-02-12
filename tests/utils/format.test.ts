import { describe, it, expect } from "vitest";
import { formatSize, formatNumber } from "../../src/utils/format.js";

describe("formatSize", () => {
  it("formats bytes", () => {
    expect(formatSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatSize(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatSize(2.1 * 1024 * 1024)).toBe("2.1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });

  it("formats zero", () => {
    expect(formatSize(0)).toBe("0 B");
  });
});

describe("formatNumber", () => {
  it("formats small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats thousands with commas", () => {
    expect(formatNumber(12483)).toBe("12,483");
  });

  it("formats millions", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});
