import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installSkill } from "../../src/commands/skill.js";

describe("skill --install", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "xml-cli-skill-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates .claude/skills/xml-cli/SKILL.md in target directory", () => {
    const result = installSkill(tempDir);

    const skillPath = join(tempDir, ".claude", "skills", "xml-cli", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);
    expect(result.action).toBe("installed");

    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("name: xml-cli");
    expect(content).toContain("allowed-tools: Bash(xml-cli:*)");
    expect(content).toContain("xml-cli stat");
  });

  it("reports 'updated' when file already exists", () => {
    // First install
    installSkill(tempDir);

    // Second install
    const result = installSkill(tempDir);
    expect(result.action).toBe("updated");

    // File still has correct content
    const skillPath = join(tempDir, ".claude", "skills", "xml-cli", "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("name: xml-cli");
  });

  it("overwrites existing file with latest content", () => {
    const skillDir = join(tempDir, ".claude", "skills", "xml-cli");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "old content", "utf-8");

    installSkill(tempDir);

    const content = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).not.toBe("old content");
    expect(content).toContain("name: xml-cli");
  });

  it("skill template contains all 13 commands", () => {
    installSkill(tempDir);

    const content = readFileSync(
      join(tempDir, ".claude", "skills", "xml-cli", "SKILL.md"),
      "utf-8",
    );

    const commands = [
      "xml-cli stat",
      "xml-cli tags",
      "xml-cli tree",
      "xml-cli select",
      "xml-cli first",
      "xml-cli count",
      "xml-cli text",
      "xml-cli attrs",
      "xml-cli fmt",
      "xml-cli json",
      "xml-cli validate",
      "xml-cli ns",
      "xml-cli schema",
    ];
    for (const cmd of commands) {
      expect(content).toContain(cmd);
    }
  });
});
