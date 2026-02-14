import type { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeOutput, writeError } from "../utils/output.js";

function getSkillTemplatePath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In compiled output: dist/commands/skill.js → project root → skills/xmlq/SKILL.md
  const projectRoot = resolve(dirname(thisFile), "..", "..");
  return join(projectRoot, "skills", "xmlq", "SKILL.md");
}

export function installSkill(cwd: string): { action: "installed" | "updated" } {
  const templatePath = getSkillTemplatePath();
  const content = readFileSync(templatePath, "utf-8");

  const targetDir = join(cwd, ".claude", "skills", "xmlq");
  const targetFile = join(targetDir, "SKILL.md");

  const existed = existsSync(targetFile);

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(targetFile, content, "utf-8");

  return { action: existed ? "updated" : "installed" };
}

export function register(program: Command): void {
  program
    .command("skill")
    .description("Install xmlq skill for Claude Code AI agent")
    .option("--install", "Deploy SKILL.md to .claude/skills/xmlq/ in current directory")
    .action((options: { install?: boolean }) => {
      if (!options.install) {
        writeError("Usage: xmlq skill --install");
        process.exit(1);
      }

      try {
        const { action } = installSkill(process.cwd());
        const targetPath = join(process.cwd(), ".claude", "skills", "xmlq", "SKILL.md");
        if (action === "installed") {
          writeOutput(`Installed ${targetPath}`, false);
        } else {
          writeOutput(`Updated ${targetPath}`, false);
        }
      } catch (err) {
        writeError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
