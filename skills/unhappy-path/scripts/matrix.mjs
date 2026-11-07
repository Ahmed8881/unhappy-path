#!/usr/bin/env node
// Renders one component across every fixture variant side by side, so missing states are visible at a glance.
// Usage: node matrix.mjs fixtures.json --component render.mjs [--css styles.css] [--width 360] > states.html
//        node matrix.mjs --test
// render.mjs default-exports (data, variant) => HTML string. For React:
//   import { renderToStaticMarkup } from "react-dom/server";
//   export default (data) => renderToStaticMarkup(<UserList users={data} />);   (or React.createElement in plain .mjs)
// A variant that throws is shown as a crash: that is a finding, not a script error.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function buildMatrix(variants, render, { css = "", width = 360 } = {}) {
  const cells = [];
  let crashes = 0;
  for (const [name, data] of Object.entries(variants)) {
    let body;
    try {
      body = `<iframe title="${esc(name)}" sandbox srcdoc="${esc(`<!doctype html><meta charset="utf-8"><style>body{margin:12px}${css}</style>${await render(data, name)}`)}"></iframe>`;
    } catch (e) {
      crashes++;
      body = `<pre class="crash" role="alert">Crashed: ${esc(e?.message ?? e)}</pre>`;
    }
    cells.push(`<figure><figcaption>${esc(name)}</figcaption>${body}</figure>`);
  }
  const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>State matrix</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f5f2; --fg: #1d1b18; --line: #d6d2ca; --bad: #b3261e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #161513; --fg: #ece8e1; --line: #3a3732; --bad: #ff8a80; } }
  body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; }
  h1 { font-size: 16px; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(${width}px, 100%), 1fr)); gap: 16px; }
  figure { margin: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  figcaption { padding: 6px 10px; border-bottom: 1px solid var(--line); font: 600 12px ui-monospace, monospace; }
  iframe { display: block; width: 100%; height: 320px; border: 0; background: #fff; resize: vertical; }
  .crash { margin: 0; padding: 12px; color: var(--bad); white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<h1>${cells.length} variants${crashes ? `, <span style="color:var(--bad)">${crashes} crashed</span>` : ""}</h1>
<div class="grid">
${cells.join("\n")}
</div>
</html>`;
  return { html, crashes };
}

async function selfTest() {
  const render = (users) => `<ul>${users.map((u) => `<li>${u.name.toUpperCase()}</li>`).join("")}</ul>`;
  const { html, crashes } = await buildMatrix(
    { one: [{ name: "Ann" }], nulls: [{ name: null }], xss: [{ name: "<script>x</script>" }] },
    render,
    { css: "li{color:red}" },
  );
  assert.equal(crashes, 1, "nulls variant crashes on .toUpperCase()");
  assert.ok(html.includes("Crashed: Cannot read properties of null"));
  assert.ok(html.includes("3 variants") && html.includes("1 crashed"));
  assert.ok(!/<script>x<\/script>/i.test(html), "rendered output is escaped into srcdoc, never live in the page");
  assert.ok(html.includes("li{color:red}"), "css is inlined into each frame");
  assert.ok(html.includes("sandbox"), "frames are sandboxed: no scripts run");
  console.log("ok");
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (args[0] === "--test") await selfTest();
  else if (!args[0] || args[0].startsWith("--") || !opt("--component")) {
    console.log("Usage: node matrix.mjs fixtures.json --component render.mjs [--css styles.css] [--width 360] > states.html");
    process.exit(2);
  } else {
    const variants = JSON.parse(readFileSync(args[0], "utf8"));
    const render = (await import(pathToFileURL(resolve(opt("--component"))).href)).default;
    if (typeof render !== "function") { console.error(`${opt("--component")} must default-export (data, variant) => html`); process.exit(2); }
    const css = opt("--css") ? readFileSync(opt("--css"), "utf8") : "";
    const { html, crashes } = await buildMatrix(variants, render, { css, width: Number(opt("--width")) || 360 });
    process.stdout.write(html);
    if (crashes) console.error(`${crashes} variant(s) crashed the component. Open the page to see which.`);
    process.exitCode = crashes ? 1 : 0;
  }
}
