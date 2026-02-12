#!/usr/bin/env node

import { Command } from "commander";

import { register as stat } from "./commands/stat.js";
import { register as tags } from "./commands/tags.js";
import { register as tree } from "./commands/tree.js";
import { register as select } from "./commands/select.js";
import { register as first } from "./commands/first.js";
import { register as count } from "./commands/count.js";
import { register as text } from "./commands/text.js";
import { register as attrs } from "./commands/attrs.js";
import { register as fmt } from "./commands/fmt.js";
import { register as json } from "./commands/json.js";
import { register as validate } from "./commands/validate.js";
import { register as ns } from "./commands/ns.js";
import { register as schema } from "./commands/schema.js";
import { register as skill } from "./commands/skill.js";

const program = new Command();

program
  .name("xml-cli")
  .description("A pipe-friendly CLI for exploring and querying XML files")
  .version("0.1.0")
  .option("--no-color", "Disable colored output")
  .option("--ns <mapping>", "Register namespace prefix for XPath (PREFIX=URI)");

// Register all commands
stat(program);
tags(program);
tree(program);
select(program);
first(program);
count(program);
text(program);
attrs(program);
fmt(program);
json(program);
validate(program);
ns(program);
schema(program);
skill(program);

program.parse();
