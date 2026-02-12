# TODO — Command Implementation

All 13 commands are scaffolded but stubbed. Ordered by priority for the core use case: **exploring and parsing large XML files**.

## Prerequisites

- [x] Install & configure XML parser (`fast-xml-parser`) — every command below depends on this
- [x] Install & configure XPath library (`@xmldom/xmldom` + `xpath`) — needed by `select` and its aliases

## Priority 1 — Foundation (parse, validate, orient)

These let you answer "what am I looking at?" on any unknown XML file.

- [x] **validate** — Is it even valid XML? Simplest command; just parse and report errors. Gate for everything else.
- [x] **stat** — File size, root element, element count, max depth, namespaces, top-level children. The first command you run on a big file.
- [x] **tree** — Structural skeleton with unique element hierarchy, attributes, repetition counts. Critical for big files where you can't eyeball the structure.
- [x] **tags** — All unique element names + occurrence counts. Tells you what's inside without reading the whole thing.

## Priority 2 — Query engine (XPath core)

The workhorse. Once you understand the structure, you need to pull data out.

- [x] **select** — Core XPath query command. All flags: `--first`, `--count`, `--text`, `--attr`, `--compact`, `--json`, `--wrap`. This is the engine that `first`, `count`, and `text` delegate to.
- [x] **first** — Shorthand for `select --first N`. The most-used command on big files — peek at matches without dumping thousands of nodes.
- [x] **count** — Shorthand for `select --count`. Gauge the scale of a match before extracting.
- [x] **text** — Shorthand for `select --text`. Extract text values, one per line — feeds into `sort | uniq -c` pipelines.

## Priority 3 — Data model discovery

Deeper inspection once you know the structure and can query.

- [x] **attrs** — List attributes of matched elements or discover all attribute names across the document. Shows cardinality and unique values.
- [x] **ns** — List namespaces. Important for writing correct XPath on namespaced documents.

## Priority 4 — Transformation & output

Convert and reformat — useful but not essential for exploration.

- [x] **fmt** — Pretty-print / minify XML. Flags: `--indent`, `--compact`, `--in-place`.
- [x] **json** — Convert XML to JSON for `jq` pipelines. Flag: `--compact`.

## Priority 5 — Advanced analysis

Most complex to implement, most niche use case.

- [x] **schema** — Infer a rough schema from the document: element hierarchy, attribute types, cardinality, value enums. Powerful but implementation-heavy.
