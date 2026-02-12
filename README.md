# xml-cli

A pipe-friendly CLI for exploring and querying XML files. Built with Node.js/TypeScript.

## Installation

```bash
npm install -g xml-cli
```

Or run directly with npx:

```bash
npx xml-cli <command> [options] [file]
```

## Usage

All commands accept a file path or read from **stdin** when no file is given. Output goes to stdout, errors to stderr.

### Commands

| Command | Description |
|---------|-------------|
| `stat` | Quick overview of an XML file (size, root, element count, namespaces) |
| `tags` | List all unique element names with occurrence counts |
| `tree` | Show the structural skeleton of the document |
| `select` | Query nodes using XPath expressions |
| `first` | Select first N matching nodes (shorthand for `select --first`) |
| `count` | Count matches for an XPath expression |
| `text` | Extract text content of matched nodes |
| `attrs` | List attributes of matched elements |
| `fmt` | Pretty-print or reformat XML |
| `json` | Convert XML to JSON |
| `validate` | Check if the file is well-formed XML |
| `ns` | List namespaces used in the document |
| `schema` | Infer a rough schema from the document |

### Global flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help |
| `--version`, `-V` | Show version |
| `--no-color` | Disable colored output |
| `--ns PREFIX=URI` | Register namespace prefix for XPath queries |

### Examples

```bash
# Get a quick overview of an XML file
xml-cli stat data.xml

# See the structure
xml-cli tree data.xml

# Find all unique element names
xml-cli tags data.xml

# Query with XPath
xml-cli select '//product[price > 100]' data.xml

# Peek at the first record
xml-cli first '//product' data.xml

# Count matches
xml-cli count '//product' data.xml

# Extract text values
xml-cli text '//product/name' data.xml

# Convert to JSON and pipe to jq
xml-cli json data.xml | jq '.catalog.product[0]'

# Pretty-print
xml-cli fmt --indent 4 data.xml

# Validate
xml-cli validate data.xml

# Pipe from stdin
curl -s https://example.com/feed.xml | xml-cli first 3 '//item'
```

## AI Agent Integration (Claude Code)

xml-cli works with [Claude Code](https://claude.ai/code) — install the skill so Claude learns to use it automatically:

```bash
# 1. Install xml-cli globally
npm install -g xml-cli

# 2. In your project, install the skill
xml-cli skill --install
```

This creates `.claude/skills/xml-cli/SKILL.md` in your project. Claude Code discovers it and can then use xml-cli to explore XML files on your behalf.

See [SPEC.md](./SPEC.md) for the full specification.

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
git clone https://github.com/pvasek/xml-cli.git
cd xml-cli
npm install
```

### Build

```bash
npm run build        # compile TypeScript to dist/
npm run dev          # watch mode — recompile on changes
```

### Run locally

```bash
node dist/index.js stat data.xml

# Or link globally for development
npm link
xml-cli stat data.xml
```

### Project structure

```
src/
├── index.ts               Entry point — CLI setup with commander
├── commands/
│   ├── stat.ts            Quick file overview
│   ├── tags.ts            List element names
│   ├── tree.ts            Structural skeleton
│   ├── select.ts          XPath query (core command)
│   ├── first.ts           First N matches shorthand
│   ├── count.ts           Count matches
│   ├── text.ts            Extract text content
│   ├── attrs.ts           List attributes
│   ├── fmt.ts             Pretty-print / reformat
│   ├── json.ts            XML to JSON conversion
│   ├── validate.ts        Well-formedness check
│   ├── ns.ts              List namespaces
│   └── schema.ts          Infer schema
└── utils/
    ├── input.ts           Read from file or stdin
    └── output.ts          TTY detection, output formatting
```

Each command file exports a `register(program: Command): void` function that adds its subcommand to the commander program.
