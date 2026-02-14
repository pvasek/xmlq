---
name: xmlq
description: Explores and queries XML files. Use when the user needs to inspect XML structure, run XPath queries, extract data, convert XML to JSON, or validate XML files.
allowed-tools: Bash(xmlq:*)
---

# xmlq — Pipe-friendly CLI for XML

## Quick start

```bash
# What is this file?
xmlq stat data.xml

# Show structure
xmlq tree data.xml

# Peek at first record
xmlq first '//product' data.xml

# Query with XPath
xmlq select '//product[price > 100]' data.xml
```

## Commands

### `xmlq stat [file]`
Quick overview — size, root element, element count, namespaces, top-level children.
```bash
xmlq stat data.xml
xmlq stat --json data.xml        # machine-readable output
cat data.xml | xmlq stat         # read from stdin
```
Flags: `--json`

### `xmlq tags [file]`
List all unique element names with occurrence counts.
```bash
xmlq tags data.xml
xmlq tags --sort name data.xml   # alphabetical
xmlq tags --depth 3 data.xml     # only top 3 levels
```
Flags: `--sort name`, `--depth N`, `--json`

### `xmlq tree [file]`
Structural skeleton — unique element hierarchy with repetition counts.
```bash
xmlq tree data.xml
xmlq tree --depth 2 data.xml
xmlq tree --no-attrs data.xml
```
Flags: `--depth N`, `--no-attrs`, `--no-counts`

### `xmlq select <xpath> [file]`
Query nodes using XPath. The core workhorse.
```bash
xmlq select '//product' data.xml
xmlq select '//product[price > 100]' --first 5 data.xml
xmlq select '//product' --count data.xml
xmlq select '//product/name' --text data.xml
xmlq select '//product' --attr sku data.xml
xmlq select '//product' --json data.xml
xmlq select '//product' --wrap data.xml       # wrap in <results>
xmlq select '//product' --compact data.xml
```
Flags: `--first N`, `--count`, `--text`, `--attr NAME`, `--compact`, `--json`, `--wrap`

### `xmlq first [N] <xpath> [file]`
First N matching nodes (default: 1). Most used for exploration.
```bash
xmlq first '//product' data.xml          # first 1
xmlq first 5 '//product' data.xml        # first 5
```

### `xmlq count <xpath> [file]`
Count XPath matches.
```bash
xmlq count '//product' data.xml
xmlq count '//product[price > 100]' data.xml
```

### `xmlq text <xpath> [file]`
Extract text content, one value per line.
```bash
xmlq text '//product/name' data.xml
xmlq text --first 10 '//product/name' data.xml
xmlq text --no-trim '//pre' data.xml
```
Flags: `--first N`, `--trim` (default: on), `--no-trim`

### `xmlq attrs [xpath] [file]`
List attributes. Without XPath, discovers all attributes in the document.
```bash
xmlq attrs data.xml                      # all attributes
xmlq attrs '//product' data.xml          # attributes of <product>
xmlq attrs --values '//product' data.xml
```
Flags: `--values`

### `xmlq fmt [file]`
Pretty-print or reformat XML.
```bash
xmlq fmt data.xml
xmlq fmt --indent 4 data.xml
xmlq fmt --compact data.xml              # minify
xmlq fmt --in-place data.xml             # overwrite file
```
Flags: `--indent N`, `--compact`, `--in-place`

### `xmlq json [file]`
Convert XML to JSON.
```bash
xmlq json data.xml
xmlq json --compact data.xml
xmlq json data.xml | jq '.catalog.product[0]'
```
Flags: `--compact`

### `xmlq validate [file]`
Check if XML is well-formed. Exit 0 = valid, exit 1 = error.
```bash
xmlq validate data.xml
xmlq validate *.xml
```

### `xmlq ns [file]`
List namespaces declared in the document.
```bash
xmlq ns data.xml
```

### `xmlq schema [file]`
Infer a rough schema — elements, attributes, nesting, value types.
```bash
xmlq schema data.xml
xmlq schema --json data.xml
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
xmlq select '//product[price > 100]' data.xml | xmlq json | jq '.[].name'

# Count products per category
xmlq text '//product/@category-ref' data.xml | sort | uniq -c | sort -rn

# Extract all SKUs to a file
xmlq text '//product/@sku' data.xml > skus.txt

# Pretty-print a fragment from stdin
curl -s https://example.com/feed.xml | xmlq first 3 '//item'

# Validate all XML files
find . -name '*.xml' -exec xmlq validate {} \;
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
