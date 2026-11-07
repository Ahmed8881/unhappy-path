#!/usr/bin/env node
// Turns one realistic record (or an array of them) into hostile variants for testing UI states.
// Usage: node fixtures.mjs sample.json [--only long,nulls]   -> JSON { variant: data } on stdout
//        node fixtures.mjs --test
// An array input gives arrays (empty/one/many included); an object input gives objects (empty = null).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const isId = (k) => /^(_?id|key|uuid|slug)$|Id$|_id$/.test(k);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));
const isUrl = (s) => /^(https?:)?\/\//.test(s) || /^\/[\w/-]+\.\w+$/.test(s);
const isEmail = (s) => /^[^\s@]+@[^\s@]+$/.test(s);

const LONG_WORD = "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch";
const TEXT = {
  long: (s) => `${LONG_WORD} ${"Wolfeschlegelsteinhausenbergerdorff ".repeat(2)}and a sentence long enough to wrap three times on a phone screen, because real users paste whole paragraphs into fields meant for one word. (${s})`,
  rtl: (s) => (s.length % 2 ? "مرحبا بالعالم، هذا نص عربي طويل" : "שלום עולם, זה טקסט בעברית"),
  emoji: () => "👩‍👩‍👧‍👦 Family 🇵🇰🇩🇪 flags 👍🏽 skin tones 🧑‍💻",
  accents: () => "Zoë Ångström-Nguyễn 李小龍 ﷺ é́́",
  xss: () => `<img src=x onerror="alert(1)"><script>alert(2)</script>"'><b>bold</b>`,
  whitespace: (s) => `   ${s}\n\tsecond line   `,
  blank: () => "",
};
const EMAIL = {
  long: () => `firstname.middlename.lastname.department.team+${LONG_WORD.toLowerCase()}@subdomain.example-company.co.uk`,
  xss: () => `"<script>alert(3)</script>"@example.com`,
  blank: () => "",
};
const NUMS = [Number.MAX_SAFE_INTEGER, -987654321.123, 0.1 + 0.2, 1e21];

// Map every non-id leaf of a value through fn(value, key).
function mapLeaves(v, fn, key = "") {
  if (Array.isArray(v)) return v.map((x) => mapLeaves(x, fn, key));
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, isId(k) ? x : mapLeaves(x, fn, k)]));
  }
  return fn(v, key);
}

function textVariant(name) {
  return (v) => {
    if (typeof v !== "string" || isDate(v) || isUrl(v)) return v;
    if (isEmail(v)) return (EMAIL[name] ?? (() => v))(v);
    return TEXT[name](v);
  };
}

const RECORD_VARIANTS = {
  nulls: (r) => Object.fromEntries(Object.entries(r).map(([k, x]) => [k, isId(k) ? x : null])),
  missing: (r) => Object.fromEntries(Object.entries(r).filter(([k]) => isId(k))),
  "huge-numbers": (r, i) => {
    let num = 0, date = i;
    return mapLeaves(r, (v) =>
      typeof v === "number" ? NUMS[(i + num++) % NUMS.length]
      : typeof v === "string" && isDate(v) ? (date++ % 2 ? "1900-01-01T00:00:00Z" : "9999-12-31T23:59:59Z")
      : v);
  },
  zero: (r) => mapLeaves(r, (v) => (typeof v === "number" ? 0 : typeof v === "boolean" ? false : v)),
  ...Object.fromEntries(Object.keys(TEXT).map((k) => [k, (r) => mapLeaves(r, textVariant(k))])),
};

const withIndexId = (r, i) => {
  const out = { ...r };
  for (const k of Object.keys(r)) {
    if (!isId(k)) continue;
    out[k] = typeof r[k] === "number" ? i + 1 : `${r[k]}-${i + 1}`;
  }
  return out;
};

export function fixtures(input) {
  const list = Array.isArray(input);
  const records = list ? input : [input];
  if (!records.length || typeof records[0] !== "object" || records[0] === null) {
    throw new Error("Input must be a JSON object or a non-empty array of objects.");
  }
  const out = list
    ? { empty: [], one: [records[0]], many: Array.from({ length: 1000 }, (_, i) => withIndexId(records[i % records.length], i)) }
    : { empty: null };
  for (const [name, fn] of Object.entries(RECORD_VARIANTS)) {
    out[name] = list ? records.map(fn) : fn(records[0], 0);
  }
  return out;
}

function selfTest() {
  const user = { id: 7, name: "Jane", email: "jane@x.io", joined: "2024-03-01", avatar: "https://x.io/a.png", orders: 3, admin: true, address: { city: "Lahore" } };
  const f = fixtures([user]);

  assert.deepEqual(f.empty, []);
  assert.equal(f.one.length, 1);
  assert.equal(f.many.length, 1000);
  assert.equal(new Set(f.many.map((u) => u.id)).size, 1000, "many has unique ids");
  assert.deepEqual(f.nulls[0], { id: 7, name: null, email: null, joined: null, avatar: null, orders: null, admin: null, address: null });
  assert.deepEqual(f.missing[0], { id: 7 });

  const long = f.long[0];
  assert.ok(long.name.length > 200 && long.name.includes(LONG_WORD));
  assert.ok(isEmail(long.email) && long.email.length > 80, "long email keeps email shape");
  assert.equal(long.joined, user.joined, "dates keep their shape in text variants");
  assert.equal(long.avatar, user.avatar, "urls keep their shape");
  assert.ok(long.address.city.includes(LONG_WORD), "nested objects are transformed");
  assert.equal(long.id, 7, "ids are never touched");

  assert.ok(/[֐-ۿ]/.test(f.rtl[0].name));
  assert.ok(f.xss[0].name.includes("<script>"));
  assert.equal(f.blank[0].name, "");
  assert.equal(f.zero[0].orders, 0);
  assert.equal(f.zero[0].admin, false);
  assert.equal(f["huge-numbers"][0].orders, Number.MAX_SAFE_INTEGER);
  assert.ok(["9999", "1900"].includes(f["huge-numbers"][0].joined.slice(0, 4)));

  const single = fixtures(user);
  assert.equal(single.empty, null);
  assert.equal(single["huge-numbers"].orders, Number.MAX_SAFE_INTEGER);
  assert.ok(!("many" in single) && single.long.name.includes(LONG_WORD));

  assert.throws(() => fixtures([]), /non-empty/);
  assert.throws(() => fixtures("x"), /JSON object/);
  console.log("ok");
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === "--test") selfTest();
  else if (!args[0] || args[0].startsWith("--")) {
    console.log("Usage: node fixtures.mjs sample.json [--only long,nulls]");
    process.exit(2);
  } else {
    let out = fixtures(JSON.parse(readFileSync(args[0], "utf8")));
    const only = args[args.indexOf("--only") + 1];
    if (args.includes("--only") && only) {
      const keep = only.split(",");
      const unknown = keep.filter((k) => !(k in out));
      if (unknown.length) { console.error(`Unknown variant(s): ${unknown.join(", ")}. Have: ${Object.keys(out).join(", ")}`); process.exit(2); }
      out = Object.fromEntries(keep.map((k) => [k, out[k]]));
    }
    console.log(JSON.stringify(out, null, 2));
  }
}
