#!/usr/bin/env node
// Static scan for missing UI states in JS/TS/JSX/TSX/Vue/Svelte files. Zero dependencies.
// Usage: node scan.mjs <dir-or-file>... [--json]
//        node scan.mjs --test
// shortcut: regex heuristics per file, not an AST; false positives are expected, upgrade to a parser if they get noisy.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".vue", ".svelte"]);
const SKIP_DIR = new Set(["node_modules", "dist", "build", ".next", ".nuxt", ".svelte-kit", "coverage", ".git", "out"]);
const SKIP_FILE = /\.(test|spec|stories|d)\.[jt]sx?$/;

const FETCH = /\b(useQuery|useSuspenseQuery|useInfiniteQuery|useSWR|useFetch|useAsyncData|useLazyFetch|createResource|createQuery)\s*\(|\bfetch\s*\(|\baxios(\.\w+)?\s*\(|\bky\.\w+\s*\(/;
const LIB_HANDLES_ERRORS = /\b(useQuery|useSuspenseQuery|useInfiniteQuery|useSWR|useFetch|useAsyncData|useLazyFetch|createResource|createQuery|useMutation)\b/;
const HAS_LOADING = /isLoading|isPending|isFetching|isValidating|\bloading\b|\bpending\b|Skeleton|Suspense|aria-busy|status\s*===?\s*["'](loading|pending)/i;
const HAS_ERROR = /\berror\b|isError|\.catch\s*\(|\bcatch\s*[({]|ErrorBoundary|onError|errorElement|error\.(tsx|jsx|vue)/i;
const HAS_EMPTY = /\.length|isEmpty|EmptyState|\bempty\b|no results|v-else|\{:else\}|\?\?/i;
const HAS_PENDING = /disabled|isSubmitting|isPending|\bpending\b|\bloading\b|aria-busy/i;
const HAS_OVERFLOW = /truncate|ellipsis|line-clamp|overflow-wrap|word-break|break-words|break-all|min-w-0|min-width:\s*0|text-wrap|whitespace-|white-space/i;
// rendered as a text child (>{x.name} or {{ x.name }}), not as a prop like key={x.name}
const USER_TEXT = />\s*\{\s*[\w.?]+\.(name|title|email|description|label|username|address|company|summary)\s*\}|\{\{\s*[\w.?]+\.(name|title|email|description|label|username|address|company|summary)\s*\}\}/;

const RULES = {
  "fetch-no-loading": "Fetches data but never renders a loading state.",
  "fetch-no-error": "Fetches data but never renders an error state.",
  "map-no-empty": "Renders a list with no empty-state branch.",
  "await-no-catch": "Uses await with no try/catch or .catch, so failures never reach the UI.",
  "catch-swallow": "Catch block only logs; the user sees nothing when this fails.",
  "submit-no-pending": "Form submits with no pending/disabled guard (double submits, no feedback).",
  "length-and": "`.length && <...>` renders a literal 0 when the list is empty.",
  "unsafe-html": "Renders raw HTML; user data here is an XSS hole.",
  "text-no-overflow": "Renders user text with no wrap/truncate rule anywhere in the file.",
};

const FIX = {
  "fetch-no-loading": "Render a skeleton shaped like the content while loading (check error first, then loading, then empty).",
  "fetch-no-error": "Render an error state with a Retry action; keep any user input.",
  "map-no-empty": "Branch on list.length === 0 after loading finishes and show an empty state with one next action.",
  "await-no-catch": "Wrap in try/catch and set a visible error state, or let a query library own the request.",
  "catch-swallow": "Set an error state (or rethrow to an error boundary) as well as logging.",
  "submit-no-pending": "Disable the submit button while pending, show progress in its label, and guard the handler.",
  "length-and": "Use `list.length > 0 && ...` or a ternary.",
  "unsafe-html": "Render as text, or sanitize (e.g. DOMPurify) before injecting.",
  "text-no-overflow": "Decide per field: overflow-wrap:anywhere, line-clamp, or truncate + title. Flex children need min-width:0.",
};

const lineOf = (src, index) => src.slice(0, index).split("\n").length;
const firstLine = (src, re) => { const m = re.exec(src); return m ? lineOf(src, m.index) : 0; };

// Blank out comments so commented-out code does not count, keeping line numbers.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "))
     .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

export function scanSource(raw, file = "input.tsx") {
  const src = stripComments(raw);
  const out = [];
  const seen = new Set();
  const add = (rule, line) => {
    if (!line || seen.has(rule + line)) return;
    seen.add(rule + line);
    out.push({ file, line, rule, message: RULES[rule], fix: FIX[rule] });
  };
  // .ts files never render; plain .js only when it looks like JSX
  const renders = /\.(jsx|tsx|vue|svelte)$/.test(file) || (/\.m?js$/.test(file) && /<[A-Za-z][\w.]*[\s>/]/.test(src));

  if (renders && FETCH.test(src)) {
    const at = firstLine(src, FETCH);
    if (!HAS_LOADING.test(src)) add("fetch-no-loading", at);
    if (!HAS_ERROR.test(src)) add("fetch-no-error", at);
  }

  if (renders && !HAS_EMPTY.test(src)) {
    add("map-no-empty", firstLine(src, /\{(?![A-Z][A-Z0-9_]*\.map)[\w.?]+\.map\s*\(|v-for=|\{#each\b/));
  }

  if (/\bawait\b/.test(src) && !LIB_HANDLES_ERRORS.test(src) && !/\btry\s*\{|\.catch\s*\(/.test(src)) {
    add("await-no-catch", firstLine(src, /\bawait\b/));
  }

  for (const m of src.matchAll(/catch\s*(\(\s*\w*\s*\))?\s*\{\s*console\.\w+\([^)]*\);?\s*\}|\.catch\s*\(\s*console\.\w+\s*\)/g)) {
    add("catch-swallow", lineOf(src, m.index));
  }

  if (/onSubmit|@submit|on:submit|type=["']submit["']/.test(src) && !HAS_PENDING.test(src)) {
    add("submit-no-pending", firstLine(src, /onSubmit|@submit|on:submit|type=["']submit["']/));
  }

  for (const m of src.matchAll(/\.length\s*&&\s*[<(]/g)) add("length-and", lineOf(src, m.index));

  for (const m of src.matchAll(/dangerouslySetInnerHTML|v-html=|\{@html\b|\.innerHTML\s*=/g)) add("unsafe-html", lineOf(src, m.index));

  if (renders && !HAS_OVERFLOW.test(src)) add("text-no-overflow", firstLine(src, USER_TEXT));

  return out.sort((a, b) => a.line - b.line);
}

function* walk(path) {
  const st = statSync(path);
  if (st.isFile()) { if (EXT.has(extname(path))) yield path; return; }
  for (const name of readdirSync(path)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(path, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.has(extname(p)) && !SKIP_FILE.test(p)) yield p;
  }
}

export function scanPaths(paths) {
  return paths.flatMap((p) => [...walk(p)].flatMap((f) => scanSource(readFileSync(f, "utf8"), f.replaceAll("\\", "/"))));
}

function selfTest() {
  const rules = (src, file) => scanSource(src, file).map((f) => f.rule);

  const bare = `export function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetch("/api/users").then(r => r.json()).then(setUsers).catch(console.error); }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}`;
  const r = rules(bare);
  for (const k of ["fetch-no-loading", "map-no-empty", "catch-swallow", "text-no-overflow"]) {
    assert.ok(r.includes(k), `bare component should flag ${k}, got ${r}`);
  }
  // the swallowed .catch is reported as catch-swallow, not twice as fetch-no-error
  assert.ok(!r.includes("fetch-no-error") && !r.includes("await-no-catch"));
  assert.ok(rules(`const A = () => { const { data } = useSWR("/u", f); return <p>{data?.count ?? 0}</p>; };`).includes("fetch-no-error"));

  const good = `export function Users() {
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["u"], queryFn: () => fetch("/api/users").then(r => r.json()) });
  if (error) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <UsersSkeleton />;
  if (data.length === 0) return <EmptyState />;
  return <ul>{data.map(u => <li className="truncate" key={u.id}>{u.name}</li>)}</ul>;
}`;
  assert.deepEqual(rules(good), [], "good component should be clean");

  assert.deepEqual(rules(`async function save() { const r = await fetch("/x"); return r.json(); }`, "api.ts"), ["await-no-catch"]);
  assert.deepEqual(rules(`async function save() { try { await fetch("/x"); } catch (e) { setError(e); } }`, "api.ts"), []);
  assert.ok(rules(`try { x() } catch (e) { console.error(e) }`, "a.ts").includes("catch-swallow"));
  assert.ok(rules(`const A = () => <div>{items.length && <List/>}</div>;`).includes("length-and"));
  assert.ok(rules(`const A = () => <div>{items.length > 0 && <List/>}</div>;`).every((k) => k !== "length-and"));
  assert.ok(rules(`const A = ({h}) => <div dangerouslySetInnerHTML={{ __html: h }} />;`).includes("unsafe-html"));
  assert.ok(rules(`const F = () => <form onSubmit={save}><button type="submit">Go</button></form>;`).includes("submit-no-pending"));
  assert.ok(!rules(`const F = () => <form onSubmit={save}><button disabled={pending}>Go</button></form>;`).includes("submit-no-pending"));

  // false positives seen on a real app: props, constant arrays, generics in .ts
  assert.ok(!rules(`const t = () => <b key={x.name} />;`).includes("text-no-overflow"));
  assert.ok(!rules(`const R = () => <div>{RATINGS.map(n => <b key={n}>{n}</b>)}</div>;`).includes("map-no-empty"));
  assert.deepEqual(rules(`export async function get(): Promise<Contract> { try { return await fetch("/c"); } catch (e) { throw e; } }`, "svc.ts"), []);
  assert.equal(scanSource(`const a = () => <div dangerouslySetInnerHTML={{__html: a}} />; el.innerHTML = b;`).length, 1, "one finding per rule per line");

  // commented-out code is ignored, line numbers survive
  assert.deepEqual(rules(`// fetch("/x")\n/* dangerouslySetInnerHTML */\nconst a = 1;`, "a.ts"), []);
  assert.equal(scanSource(`const a = 1;\n\nconst A = () => <div dangerouslySetInnerHTML={{__html: x}} />;`).find((f) => f.rule === "unsafe-html").line, 3);

  // Vue
  const vue = `<template><li v-for="u in users" :key="u.id">{{ u.name }}</li></template>
<script setup>const { data: users } = await useFetch("/api/users")</script>`;
  const v = rules(vue, "Users.vue");
  assert.ok(v.includes("map-no-empty") && v.includes("fetch-no-loading") && v.includes("text-no-overflow"), `vue: ${v}`);
  assert.ok(!v.includes("await-no-catch"), "useFetch owns errors");

  console.log("ok");
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === "--test") selfTest();
  else if (!args.filter((a) => !a.startsWith("--")).length) {
    console.log("Usage: node scan.mjs <dir-or-file>... [--json]");
    process.exit(2);
  } else {
    const findings = scanPaths(args.filter((a) => !a.startsWith("--")));
    if (args.includes("--json")) console.log(JSON.stringify(findings, null, 2));
    else if (!findings.length) console.log("No missing states found.");
    else {
      for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule}\n  ${f.message}\n  fix: ${f.fix}\n`);
      const files = new Set(findings.map((f) => f.file)).size;
      console.log(`${findings.length} finding(s) in ${files} file(s). Heuristic: fix what is real, note false positives.`);
    }
    process.exit(findings.length ? 1 : 0);
  }
}
