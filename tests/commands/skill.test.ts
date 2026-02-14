import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installSkill } from "../../src/commands/skill.js";

describe("skill --install", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "xmlq-skill-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates .claude/skills/xmlq/SKILL.md in target directory", () => {
    const result = installSkill(tempDir);

    const skillPath = join(tempDir, ".claude", "skills", "xmlq", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);
    expect(result.action).toBe("installed");

    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("name: xmlq");
    expect(content).toContain("allowed-tools: Bash(xmlq:*)");
    expect(content).toContain("xmlq stat");
  });

  it("reports 'updated' when file already exists", () => {
    // First install
    installSkill(tempDir);

    // Second install
    const result = installSkill(tempDir);
    expect(result.action).toBe("updated");

    // File still has correct content
    const skillPath = join(tempDir, ".claude", "skills", "xmlq", "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("name: xmlq");
  });

  it("overwrites existing file with latest content", () => {
    const skillDir = join(tempDir, ".claude", "skills", "xmlq");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "old content", "utf-8");

    installSkill(tempDir);

    const content = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).not.toBe("old content");
    expect(content).toContain("name: xmlq");
  });

  it("skill template contains all 13 commands", () => {
    installSkill(tempDir);

    const content = readFileSync(
      join(tempDir, ".claude", "skills", "xmlq", "SKILL.md"),
      "utf-8",
    );

    const commands = [
      "xmlq stat",
      "xmlq tags",
      "xmlq tree",
      "xmlq select",
      "xmlq first",
      "xmlq count",
      "xmlq text",
      "xmlq attrs",
      "xmlq fmt",
      "xmlq json",
      "xmlq validate",
      "xmlq ns",
      "xmlq schema",
    ];
    for (const cmd of commands) {
      expect(content).toContain(cmd);
    }
  });
});
