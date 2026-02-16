import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installSkill } from "../../src/commands/skill.js";

describe("skill install", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "xmlq-skill-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("claude target", () => {
    it("creates .claude/skills/xmlq/SKILL.md in target directory", () => {
      const result = installSkill(tempDir, "claude");

      const skillPath = join(tempDir, ".claude", "skills", "xmlq", "SKILL.md");
      expect(existsSync(skillPath)).toBe(true);
      expect(result.action).toBe("installed");
      expect(result.targetFile).toBe(skillPath);

      const content = readFileSync(skillPath, "utf-8");
      expect(content).toContain("name: xmlq");
      expect(content).toContain("allowed-tools: Bash(xmlq:*)");
      expect(content).toContain("xmlq stat");
    });

    it("reports 'updated' when file already exists", () => {
      installSkill(tempDir, "claude");
      const result = installSkill(tempDir, "claude");
      expect(result.action).toBe("updated");

      const skillPath = join(tempDir, ".claude", "skills", "xmlq", "SKILL.md");
      const content = readFileSync(skillPath, "utf-8");
      expect(content).toContain("name: xmlq");
    });

    it("overwrites existing file with latest content", () => {
      const skillDir = join(tempDir, ".claude", "skills", "xmlq");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "old content", "utf-8");

      installSkill(tempDir, "claude");

      const content = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
      expect(content).not.toBe("old content");
      expect(content).toContain("name: xmlq");
    });
  });

  describe("codex target", () => {
    it("creates codex.md in project root", () => {
      const result = installSkill(tempDir, "codex");

      const skillPath = join(tempDir, "codex.md");
      expect(existsSync(skillPath)).toBe(true);
      expect(result.action).toBe("installed");
      expect(result.targetFile).toBe(skillPath);

      const content = readFileSync(skillPath, "utf-8");
      expect(content).toContain("name: xmlq");
    });

    it("reports 'updated' when codex.md already exists", () => {
      installSkill(tempDir, "codex");
      const result = installSkill(tempDir, "codex");
      expect(result.action).toBe("updated");
    });
  });

  describe("opencode target", () => {
    it("creates .opencode/skills/xmlq/SKILL.md", () => {
      const result = installSkill(tempDir, "opencode");

      const skillPath = join(
        tempDir,
        ".opencode",
        "skills",
        "xmlq",
        "SKILL.md",
      );
      expect(existsSync(skillPath)).toBe(true);
      expect(result.action).toBe("installed");
      expect(result.targetFile).toBe(skillPath);

      const content = readFileSync(skillPath, "utf-8");
      expect(content).toContain("name: xmlq");
    });

    it("reports 'updated' when file already exists", () => {
      installSkill(tempDir, "opencode");
      const result = installSkill(tempDir, "opencode");
      expect(result.action).toBe("updated");
    });
  });

  describe("dest target", () => {
    it("creates SKILL.md in custom destination", () => {
      const result = installSkill(tempDir, "dest", "my-custom-dir");

      const skillPath = join(tempDir, "my-custom-dir", "SKILL.md");
      expect(existsSync(skillPath)).toBe(true);
      expect(result.action).toBe("installed");
      expect(result.targetFile).toBe(skillPath);

      const content = readFileSync(skillPath, "utf-8");
      expect(content).toContain("name: xmlq");
    });

    it("throws when dest path is missing", () => {
      expect(() => installSkill(tempDir, "dest")).toThrow(
        "--dest requires a path argument",
      );
    });

    it("creates nested destination directories", () => {
      installSkill(tempDir, "dest", "deep/nested/path");

      const skillPath = join(tempDir, "deep", "nested", "path", "SKILL.md");
      expect(existsSync(skillPath)).toBe(true);
    });
  });

  describe("unknown target", () => {
    it("throws for unknown agent target", () => {
      expect(() => installSkill(tempDir, "unknown")).toThrow(
        "Unknown agent target: unknown",
      );
    });
  });

  it("skill template contains all 13 commands", () => {
    installSkill(tempDir, "claude");

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
