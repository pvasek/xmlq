# xml-cli — Spec

A pipe-friendly CLI for exploring and querying XML files. Built with Node.js/TypeScript.

Binary name: **`xml-cli`**

```
xml-cli <command> [options] [file]
```

All commands accept a file path or read from **stdin** when no file is given.
All output goes to **stdout** (machine-readable by default), errors/warnings to **stderr**.

---

## Commands

### `xml-cli stat`

Quick overview of an XML file — the first thing you run on an unfamiliar file.

```
xml-cli stat data.xml
```

```
File:       data.xml (2.1 MB)
Root:       <catalog xmlns="urn:example:catalog">
Elements:   12,483
Max depth:  6
Namespaces: urn:example:catalog, urn:example:meta
Top-level:  <product> x 1200, <category> x 45, <metadata> x 1
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for piping) |

---

### `xml-cli tags`

List all unique element names with occurrence counts. Essential for understanding what a file contains.

```
xml-cli tags data.xml
```

```
  1200  product
  1200  price
  1200  name
  1200  sku
    45  category
    45  description
     1  catalog
     1  metadata
```

| Flag | Description |
|------|-------------|
| `--sort name` | Sort alphabetically instead of by count (default: by count desc) |
| `--depth N` | Only count tags up to depth N |
| `--json` | Output as JSON |

---

### `xml-cli tree`

Show the **structural skeleton** of the document — unique element hierarchy, not every node. Critical for understanding nesting without drowning in output.

```
xml-cli tree data.xml
```

```
catalog
├── metadata
│   ├── created
│   └── version
├── category  (x45)
│   ├── @id
│   ├── name
│   └── description
└── product  (x1200)
    ├── @sku
    ├── @category-ref
    ├── name
    ├── price
    │   ├── @currency
    │   └── #text
    └── tags
        └── tag  (x1..5)
```

Shows attributes as `@attr`, text content as `#text` (only when element has both children and text). Repetition counts shown in parentheses.

| Flag | Description |
|------|-------------|
| `--depth N` | Limit tree depth (default: unlimited) |
| `--no-attrs` | Hide attributes |
| `--no-counts` | Hide repetition counts |

---

### `xml-cli select`

Query nodes using **XPath** expressions. The core workhorse command.

```
xml-cli select '//product[price > 100]' data.xml
```

Outputs matching XML fragments, one per match:

```xml
<product sku="A-001" category-ref="electronics">
  <name>Widget Pro</name>
  <price currency="USD">149.99</price>
  <tags><tag>premium</tag><tag>new</tag></tags>
</product>
```

| Flag | Description |
|------|-------------|
| `--first N` | Return only first N matches (crucial for large files) |
| `--count` | Just print the number of matches |
| `--text` | Extract text content only (one line per match) |
| `--attr NAME` | Extract a specific attribute value (one line per match) |
| `--compact` | Output XML without pretty-printing |
| `--json` | Convert matched nodes to JSON |
| `--wrap` | Wrap multiple results in a `<results>` root element |

**Short aliases for common patterns:**

```bash
# These are equivalent:
xml-cli select '//product' --first 1 data.xml
xml-cli first '//product' data.xml

# These are equivalent:
xml-cli select '//product' --count data.xml
xml-cli count '//product' data.xml

# These are equivalent:
xml-cli select '//product/name' --text data.xml
xml-cli text '//product/name' data.xml
```

---

### `xml-cli first`

Shorthand: select first N matching nodes. The most used command when exploring — you almost never want all 1200 products dumped to your terminal.

```
xml-cli first '//product' data.xml          # first 1 match
xml-cli first 5 '//product' data.xml        # first 5 matches
```

---

### `xml-cli count`

Count matches for an XPath expression.

```
xml-cli count '//product' data.xml
# 1200

xml-cli count '//product[price > 100]' data.xml
# 342
```

---

### `xml-cli text`

Extract text content of matched nodes, one value per line.

```
xml-cli text '//product/name' data.xml
```

```
Widget Pro
Widget Basic
Gadget X
...
```

| Flag | Description |
|------|-------------|
| `--first N` | Limit to first N |
| `--trim` | Trim whitespace (default: on) |
| `--no-trim` | Preserve original whitespace |

---

### `xml-cli attrs`

List attributes of matched elements. Useful for discovering the data model.

```
xml-cli attrs '//product' data.xml
```

When used without XPath, discovers all attribute names across the entire document:

```
xml-cli attrs data.xml
```

```
product/@sku          1200 unique values
product/@category-ref   45 unique values
price/@currency          3 unique values  [USD, EUR, GBP]
category/@id            45 unique values
```

Small-cardinality attributes (<=10 unique values) show all distinct values inline.

| Flag | Description |
|------|-------------|
| `--values` | List all unique values per attribute |

---

### `xml-cli fmt`

Pretty-print / reformat XML.

```
xml-cli fmt data.xml                   # pretty-print to stdout
xml-cli fmt --indent 4 data.xml       # custom indent
xml-cli fmt --compact data.xml        # minify
```

| Flag | Description |
|------|-------------|
| `--indent N` | Spaces per indent level (default: 2) |
| `--compact` | Minify — remove all insignificant whitespace |
| `--in-place` | Overwrite the file (instead of writing to stdout) |

---

### `xml-cli json`

Convert XML to JSON. Pipe to `jq` for further processing.

```
xml-cli json data.xml | jq '.catalog.product[0]'
xml-cli select '//product' --first 5 data.xml | xml-cli json
```

| Flag | Description |
|------|-------------|
| `--compact` | Minify JSON output |

---

### `xml-cli validate`

Check if the file is well-formed XML.

```
xml-cli validate data.xml
# OK: well-formed XML

xml-cli validate broken.xml
# ERROR: line 42, col 15: unexpected closing tag </item>
```

Exit code: `0` for valid, `1` for errors.

---

### `xml-cli ns`

List namespaces used in the document.

```
xml-cli ns data.xml
```

```
default   urn:example:catalog
meta      urn:example:meta
xsi       http://www.w3.org/2001/XMLSchema-instance
```

---

### `xml-cli schema`

Infer a rough schema from the document — shows which elements appear where, their attributes, whether they contain text or children, and optionally value types.

```
xml-cli schema data.xml
```

```yaml
catalog:
  attrs: [xmlns]
  children: [metadata, category, product]

  metadata:
    children: [created, version]
    created: { text: date }
    version: { text: string }

  category:
    count: 45
    attrs: [id(unique)]
    children: [name, description]
    name: { text: string }
    description: { text: string }

  product:
    count: 1200
    attrs: [sku(unique), category-ref]
    children: [name, price, tags]
    name: { text: string }
    price: { attrs: [currency(enum:USD|EUR|GBP)], text: decimal }
    tags:
      children: [tag]
      tag: { count: 1..5, text: string }
```

| Flag | Description |
|------|-------------|
| `--json` | Output inferred schema as JSON |

---

### `xml-cli skill`

Install the xml-cli skill for Claude Code AI agent integration.

```
xml-cli skill --install
```

Creates `.claude/skills/xml-cli/SKILL.md` in the current directory. This file teaches Claude Code how to use xml-cli commands — Claude discovers it automatically and can then use xml-cli to explore XML files on the user's behalf.

| Flag | Description |
|------|-------------|
| `--install` | Deploy SKILL.md to `.claude/skills/xml-cli/` in current directory |

Prints "Installed" on first run, "Updated" if the file already existed.

---

## AI Agent Integration

xml-cli can be used by AI coding agents like Claude Code. The `skill --install` command deploys a skill file that teaches the agent all available commands, flags, and pipe patterns.

**Setup:**

```bash
# 1. Install xml-cli globally
npm install -g xml-cli

# 2. In your project directory, install the skill
xml-cli skill --install
```

After this, Claude Code will automatically discover and use xml-cli when working with XML files in the project.

---

## Global flags

These work with any command:

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |
| `--no-color` | Disable colored output |
| `--ns PREFIX=URI` | Register namespace prefix for XPath queries |

---

## Piping & composition

The CLI is designed for Unix pipelines:

```bash
# Find expensive products, convert to JSON, process with jq
xml-cli select '//product[price > 100]' data.xml | xml-cli json | jq '.[].name'

# Count products per category
xml-cli text '//product/@category-ref' data.xml | sort | uniq -c | sort -rn

# Extract all SKUs to a file
xml-cli text '//product/@sku' data.xml > skus.txt

# Pretty-print a fragment from a larger pipeline
curl -s https://api.example.com/feed.xml | xml-cli first 3 '//item'

# Validate all XML files in a directory
find . -name '*.xml' -exec xml-cli validate {} \;
```

---

## Implementation notes

- **Parser**: DOM-based (e.g. `fast-xml-parser`) for v1. Design command interfaces so a streaming/SAX backend can be swapped in later for large files.
- **XPath**: Use `xpath` or `fontoxpath` for XPath 1.0/2.0 support. XPath is the standard XML query language — no need to invent a custom one.
- **Output**: Colored + human-friendly when stdout is a TTY, plain text when piped. `--json` flag always produces machine-readable output.
- **Packaging**: Publish to npm (`npx xml-cli`), optionally bundle with `pkg` or `bun build --compile` for a standalone binary.

### Exploration workflow

The commands are designed around a typical discovery workflow:

```
stat  →  "what is this file?"
tree  →  "what's the structure?"
tags  →  "what elements exist?"
attrs →  "what data fields are there?"
first →  "show me an example record"
select → "query specific data"
text  →  "extract values"
json  →  "convert for further processing"
```
