// Structural checks for the published skill: manifests, frontmatter, file size budgets, links.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILL = "skills/unhappy-path";
const errors = [];
const lines = (f) => readFileSync(f, "utf8").split("\n").length;

const plugin = JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf8"));
const market = JSON.parse(readFileSync(".claude-plugin/marketplace.json", "utf8"));
const entry = market.plugins.find((p) => p.name === plugin.name);
if (!entry) errors.push("marketplace.json has no entry for plugin.json's name");
else if (entry.version !== plugin.version) errors.push(`version mismatch: plugin.json ${plugin.version}, marketplace.json ${entry.version}`);

const md = readFileSync(`${SKILL}/SKILL.md`, "utf8");
const fm = md.match(/^---\n([\s\S]*?)\n---/);
if (!fm) errors.push("SKILL.md has no frontmatter");
else {
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1].trim() ?? "";
  if (name !== "unhappy-path") errors.push(`frontmatter name "${name}" must match the folder name`);
  if (desc.length < 50 || desc.length > 1024) errors.push(`description is ${desc.length} chars (50-1024)`);
}
if (lines(`${SKILL}/SKILL.md`) > 400) errors.push(`SKILL.md is ${lines(`${SKILL}/SKILL.md`)} lines (max 400)`);

for (const f of readdirSync(`${SKILL}/references`)) {
  const n = lines(join(SKILL, "references", f));
  if (n > 150) errors.push(`references/${f} is ${n} lines (max 150)`);
}

// Every file path SKILL.md mentions must exist
for (const [, p] of md.matchAll(/`((?:references|scripts|assets)\/[\w./*-]+)`/g)) {
  if (p.includes("*")) continue;
  if (!existsSync(join(SKILL, p))) errors.push(`SKILL.md references missing file ${p}`);
}

if (errors.length) { console.error(errors.map((e) => `- ${e}`).join("\n")); process.exit(1); }
console.log("skill structure ok");
