# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xml-cli is a pipe-friendly CLI for exploring and querying XML files, built with TypeScript/Node.js. It uses Commander.js for CLI argument parsing. Currently v0.1.0 — all 13 commands are scaffolded but their implementations are stubbed (TODO).

The full specification lives in **SPEC.md** — always consult it when implementing commands.

## Build & Development Commands

```bash
npm run build          # Compile TypeScript (src/ → dist/)
npm run dev            # Watch mode — recompile on changes
npm test               # Run tests once (CI, pre-commit)
npm run test:watch     # Watch mode — re-runs on file changes (use during TDD)
node dist/index.js <command> [options] [file]   # Run locally
```

## TDD Workflow

Use **red-green-refactor** for all implementation work:

1. **Red** — Write a failing test first (`tests/commands/<name>.test.ts` or `tests/utils/<name>.test.ts`)
2. **Green** — Write the minimal code to make it pass
3. **Refactor** — Clean up while keeping tests green

### Rules

- Always run `npm run test:watch` during development sessions
- Test file naming mirrors source: `src/commands/stat.ts` → `tests/commands/stat.test.ts`
- Never mark a command as "done" without passing tests
- **Unit tests** for utils/parsers (pure function in → out)
- **Integration tests** for commands: feed XML string → assert stdout, stderr, and exit code
- Testing framework: **Vitest** (native TS + ESM, no compile step needed)

## Architecture

- **ES Modules** throughout (`"type": "module"` in package.json). Imports use `.js` extensions even for `.ts` source files.
- **TypeScript strict mode** with target ES2022, Node16 module resolution.
- **Entry point**: `src/index.ts` — creates the Commander program, registers all 13 commands, calls `program.parse()`.

### Command Pattern

Each file in `src/commands/` exports a single `register(program: Command): void` function. Commands are async-first — all action handlers are `async`.

### Utilities

- `src/utils/input.ts` — `readInput(filePath?)` reads from file or stdin
- `src/utils/output.ts` — `writeOutput(data, asJson)`, `writeError(message)`, `isTTY()` for TTY detection

### Output Convention

- Colored/human-friendly when stdout is a TTY, plain when piped
- `--json` flag produces machine-readable JSON
- Errors go to stderr via `writeError()`
- Exit code 0 for success, 1 for errors

### Argument Disambiguation

Some commands need special handling for ambiguous positional args:
- `first`: first arg can be N (number) or xpath — needs disambiguation
- `attrs`: first arg can be xpath or file path — needs disambiguation

## Dependencies

- **Production**: `commander` (CLI framework) — the only runtime dependency
- **Planned** (not yet installed): `fast-xml-parser` (DOM parsing), `xpath`/`fontoxpath` (XPath queries)

## Key Design Decisions (from SPEC.md)

- DOM-based parser for v1, but design interfaces for future SAX/streaming swap
- XPath 1.0/2.0 via standard libraries — no custom query language
- Pipe-friendly: stdin when no file arg, stdout for results, stderr for errors
- Global `--ns PREFIX=URI` option for namespace-aware XPath queries
