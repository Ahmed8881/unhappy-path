# unhappy-path

[![ci](https://github.com/Ahmed8881/unhappy-path/actions/workflows/ci.yml/badge.svg)](https://github.com/Ahmed8881/unhappy-path/actions/workflows/ci.yml)

A Claude Code skill by **Ahmed Butt** that makes Claude build the UI states it
usually skips.

Generated UI is built against perfect data: the request returns instantly, the
list has three items, every name is "Jane Cooper", and nothing fails. Real users
see the other states first: a blank screen while data loads, a raw `undefined`,
a long surname that breaks the card, a spinner that never stops.

With this skill, Claude:

1. **Lists the states first**: loading, empty (first use vs. no results vs. cleared),
   error, partial data, overflow, slow/offline, no permission, success after an action.
2. **Builds each one for real**: skeletons that keep the layout, empty states with a
   next action, errors that say what happened and keep the user's input, no
   `undefined` on screen, a decided rule for long text, safe submits, screen reader announcements.
3. **Tests with hostile data**: long words, RTL, emoji, `null` fields, 0 / 1 / 1,000 items,
   huge numbers, XSS strings.
4. **Scans before handing over**, and reports which states it covered and which it skipped.

## Scripts

Node 20+, zero dependencies. Each has a `--test` self-check.

| Script | What it does |
|---|---|
| `scan.mjs <dir>` | Flags data fetching with no loading/error branch, lists with no empty state, `await` with no `catch`, swallowed errors, unguarded submits, `.length && <X/>`, raw HTML, and user text with no overflow rule. Prints `file:line` and a fix. Exits 1 on findings. |
| `fixtures.mjs sample.json` | Turns one record into 14 hostile variants (`empty`, `one`, `many`, `nulls`, `missing`, `long`, `rtl`, `emoji`, `huge-numbers`, `zero`, `xss`, ...). |
| `matrix.mjs fixtures.json --component render.mjs` | Renders a component in every variant side by side in one HTML page. A variant that crashes the component shows up red. |

```bash
node skills/unhappy-path/scripts/scan.mjs src/
```

```
src/components/UserList.tsx:7  fetch-no-loading
  Fetches data but never renders a loading state.
  fix: Render a skeleton shaped like the content while loading (check error first, then loading, then empty).
```

`scan.mjs` uses regex heuristics, not a parser, so expect some false positives.
The skill tells Claude to fix the real findings and say which ones it judged false.

## Install

### As a plugin (recommended)

Inside Claude Code:

```
/plugin marketplace add Ahmed8881/unhappy-path
/plugin install unhappy-path@unhappy-path
```

### Manually, as a personal skill

```bash
git clone https://github.com/Ahmed8881/unhappy-path.git
mkdir -p ~/.claude/skills
cp -r unhappy-path/skills/unhappy-path ~/.claude/skills/
```

### Manually, as a project skill

```bash
mkdir -p .claude/skills
cp -r unhappy-path/skills/unhappy-path .claude/skills/
```

## Works well with

- [ahmed-ui-craft](https://github.com/Ahmed8881/ahmed-ui-craft): how the UI looks.
- [ui-slop](https://github.com/Ahmed8881/ui-slop): how AI-generated it reads.
- unhappy-path: whether it holds up with real data.

## License

MIT
