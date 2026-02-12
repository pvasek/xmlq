import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureOutput } from "../helpers.js";
import { runNs } from "../../src/commands/ns.js";

describe("ns command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists default namespace", async () => {
    const cap = captureOutput();
    try {
      await runNs('<root xmlns="http://example.com"><child/></root>');
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("default");
    expect(result.stdout).toContain("http://example.com");
  });

  it("lists prefixed namespaces", async () => {
    const cap = captureOutput();
    try {
      await runNs(
        '<root xmlns:ns="http://ns.example.com" xmlns:meta="http://meta.example.com"><ns:child/></root>',
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("ns");
    expect(result.stdout).toContain("http://ns.example.com");
    expect(result.stdout).toContain("meta");
    expect(result.stdout).toContain("http://meta.example.com");
  });

  it("lists namespaces from nested elements", async () => {
    const cap = captureOutput();
    try {
      await runNs(
        '<root><child xmlns:deep="http://deep.example.com"><deep:item/></child></root>',
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    expect(result.stdout).toContain("deep");
    expect(result.stdout).toContain("http://deep.example.com");
  });

  it("outputs nothing for document with no namespaces", async () => {
    const cap = captureOutput();
    try {
      await runNs("<root><child/></root>");
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Should produce empty or just a newline
    expect(result.stdout.trim()).toBe("");
  });

  it("deduplicates namespaces declared multiple times", async () => {
    const cap = captureOutput();
    try {
      await runNs(
        '<root xmlns:ns="http://ns.example.com"><a xmlns:ns="http://ns.example.com"/></root>',
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    // Should only appear once
    const matches = result.stdout.match(/http:\/\/ns\.example\.com/g);
    expect(matches).toHaveLength(1);
  });

  it("outputs JSON when --json flag is set", async () => {
    const cap = captureOutput();
    try {
      await runNs(
        '<root xmlns="http://example.com" xmlns:ns="http://ns.example.com"/>',
        { json: true },
      );
    } catch {}
    const result = cap.getOutput();
    cap.restore();
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toContainEqual({ prefix: "default", uri: "http://example.com" });
    expect(json).toContainEqual({ prefix: "ns", uri: "http://ns.example.com" });
  });
});
