import type { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeOutput, writeError } from "../utils/output.js";

interface AgentTarget {
  name: string;
  targetPath: (cwd: string) => string;
}

export const AGENT_TARGETS: Record<string, AgentTarget> = {
  claude: {
    name: "Claude Code",
    targetPath: (cwd) => join(cwd, ".claude", "skills", "xmlq", "SKILL.md"),
  },
  codex: {
    name: "Codex",
    targetPath: (cwd) => join(cwd, "codex.md"),
  },
  opencode: {
    name: "OpenCode",
    targetPath: (cwd) => join(cwd, ".opencode", "skills", "xmlq", "SKILL.md"),
  },
};

function getSkillTemplatePath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In compiled output: dist/commands/skill.js → project root → skills/xmlq/SKILL.md
  const projectRoot = resolve(dirname(thisFile), "..", "..");
  return join(projectRoot, "skills", "xmlq", "SKILL.md");
}

export function installSkill(
  cwd: string,
  target: string,
  dest?: string,
): { action: "installed" | "updated"; targetFile: string } {
  const templatePath = getSkillTemplatePath();
  const content = readFileSync(templatePath, "utf-8");

  let targetFile: string;
  if (target === "dest") {
    if (!dest) throw new Error("--dest requires a path argument");
    targetFile = join(cwd, dest, "SKILL.md");
  } else {
    const agent = AGENT_TARGETS[target];
    if (!agent) throw new Error(`Unknown agent target: ${target}`);
    targetFile = agent.targetPath(cwd);
  }

  const existed = existsSync(targetFile);

  mkdirSync(dirname(targetFile), { recursive: true });
  writeFileSync(targetFile, content, "utf-8");

  return { action: existed ? "updated" : "installed", targetFile };
}

const USAGE = `Usage: xmlq skill <option>

Options:
  --claude          Install to .claude/skills/xmlq/SKILL.md (Claude Code)
  --codex           Install to codex.md (Codex)
  --opencode        Install to .opencode/skills/xmlq/SKILL.md (OpenCode)
  --dest <path>     Install to <path>/SKILL.md (custom destination)
  --install         Alias for --claude`;

export function register(program: Command): void {
  program
    .command("skill")
    .description("Install xmlq skill for AI coding agents")
    .option("--install", "Alias for --claude")
    .option("--claude", "Deploy to .claude/skills/xmlq/ (Claude Code)")
    .option("--codex", "Deploy to codex.md (Codex)")
    .option("--opencode", "Deploy to .opencode/skills/xmlq/ (OpenCode)")
    .option("--dest <path>", "Deploy to custom destination directory")
    .action(
      (options: {
        install?: boolean;
        claude?: boolean;
        codex?: boolean;
        opencode?: boolean;
        dest?: string;
      }) => {
        const targets: string[] = [];
        if (options.install || options.claude) targets.push("claude");
        if (options.codex) targets.push("codex");
        if (options.opencode) targets.push("opencode");
        if (options.dest) targets.push("dest");

        if (targets.length === 0) {
          writeError(USAGE);
          process.exit(1);
        }

        try {
          for (const target of targets) {
            const { action, targetFile } = installSkill(
              process.cwd(),
              target,
              target === "dest" ? options.dest : undefined,
            );
            const verb = action === "installed" ? "Installed" : "Updated";
            writeOutput(`${verb} ${targetFile}`, false);
          }
        } catch (err) {
          writeError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
