---
name: xml-cli
description: Explores and queries XML files. Use when the user needs to inspect XML structure, run XPath queries, extract data, convert XML to JSON, or validate XML files.
allowed-tools: Bash(xml-cli:*)
---

# xml-cli — Pipe-friendly CLI for XML

## Quick start

```bash
# What is this file?
xml-cli stat data.xml

# Show structure
xml-cli tree data.xml

# Peek at first record
xml-cli first '//product' data.xml

# Query with XPath
xml-cli select '//product[price > 100]' data.xml
```

## Commands

### `xml-cli stat [file]`
Quick overview — size, root element, element count, namespaces, top-level children.
```bash
xml-cli stat data.xml
xml-cli stat --json data.xml        # machine-readable output
cat data.xml | xml-cli stat         # read from stdin
```
Flags: `--json`

### `xml-cli tags [file]`
List all unique element names with occurrence counts.
```bash
xml-cli tags data.xml
xml-cli tags --sort name data.xml   # alphabetical
xml-cli tags --depth 3 data.xml     # only top 3 levels
```
Flags: `--sort name`, `--depth N`, `--json`

### `xml-cli tree [file]`
Structural skeleton — unique element hierarchy with repetition counts.
```bash
xml-cli tree data.xml
xml-cli tree --depth 2 data.xml
xml-cli tree --no-attrs data.xml
```
Flags: `--depth N`, `--no-attrs`, `--no-counts`

### `xml-cli select <xpath> [file]`
Query nodes using XPath. The core workhorse.
```bash
xml-cli select '//product' data.xml
xml-cli select '//product[price > 100]' --first 5 data.xml
xml-cli select '//product' --count data.xml
xml-cli select '//product/name' --text data.xml
xml-cli select '//product' --attr sku data.xml
xml-cli select '//product' --json data.xml
xml-cli select '//product' --wrap data.xml       # wrap in <results>
xml-cli select '//product' --compact data.xml
```
Flags: `--first N`, `--count`, `--text`, `--attr NAME`, `--compact`, `--json`, `--wrap`

### `xml-cli first [N] <xpath> [file]`
First N matching nodes (default: 1). Most used for exploration.
```bash
xml-cli first '//product' data.xml          # first 1
xml-cli first 5 '//product' data.xml        # first 5
```

### `xml-cli count <xpath> [file]`
Count XPath matches.
```bash
xml-cli count '//product' data.xml
xml-cli count '//product[price > 100]' data.xml
```

### `xml-cli text <xpath> [file]`
Extract text content, one value per line.
```bash
xml-cli text '//product/name' data.xml
xml-cli text --first 10 '//product/name' data.xml
xml-cli text --no-trim '//pre' data.xml
```
Flags: `--first N`, `--trim` (default: on), `--no-trim`

### `xml-cli attrs [xpath] [file]`
List attributes. Without XPath, discovers all attributes in the document.
```bash
xml-cli attrs data.xml                      # all attributes
xml-cli attrs '//product' data.xml          # attributes of <product>
xml-cli attrs --values '//product' data.xml
```
Flags: `--values`

### `xml-cli fmt [file]`
Pretty-print or reformat XML.
```bash
xml-cli fmt data.xml
xml-cli fmt --indent 4 data.xml
xml-cli fmt --compact data.xml              # minify
xml-cli fmt --in-place data.xml             # overwrite file
```
Flags: `--indent N`, `--compact`, `--in-place`

### `xml-cli json [file]`
Convert XML to JSON.
```bash
xml-cli json data.xml
xml-cli json --compact data.xml
xml-cli json data.xml | jq '.catalog.product[0]'
```
Flags: `--compact`

### `xml-cli validate [file]`
Check if XML is well-formed. Exit 0 = valid, exit 1 = error.
```bash
xml-cli validate data.xml
xml-cli validate *.xml
```

### `xml-cli ns [file]`
List namespaces declared in the document.
```bash
xml-cli ns data.xml
```

### `xml-cli schema [file]`
Infer a rough schema — elements, attributes, nesting, value types.
```bash
xml-cli schema data.xml
xml-cli schema --json data.xml
```
Flags: `--json`

## Global flags

| Flag | Description |
|------|-------------|
| `--no-color` | Disable colored output |
| `--ns PREFIX=URI` | Register namespace for XPath (e.g., `--ns ns=http://example.com`) |

## Pipe composition

```bash
# Find expensive products → JSON → jq
xml-cli select '//product[price > 100]' data.xml | xml-cli json | jq '.[].name'

# Count products per category
xml-cli text '//product/@category-ref' data.xml | sort | uniq -c | sort -rn

# Extract all SKUs to a file
xml-cli text '//product/@sku' data.xml > skus.txt

# Pretty-print a fragment from stdin
curl -s https://example.com/feed.xml | xml-cli first 3 '//item'

# Validate all XML files
find . -name '*.xml' -exec xml-cli validate {} \;
```

## Typical exploration workflow

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
