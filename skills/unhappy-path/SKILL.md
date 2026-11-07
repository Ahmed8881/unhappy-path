---
name: unhappy-path
description: Makes every data-driven UI ship with the states models usually skip - loading, empty, error, partial data, overflow (long text, huge numbers, many items), slow or offline network, and no permission - instead of only the happy path with three perfect sample rows. Use this skill whenever the task builds or changes a component, page, or screen that fetches, lists, submits, uploads, or displays user or server data (tables, lists, feeds, dashboards, search, forms, file uploads, profiles, detail pages, settings, checkout), and when reviewing frontend code for robustness, "it breaks with real data", blank screens, infinite spinners, or missing error handling. Works with React/Next.js, Vue, Svelte, React Native, and plain HTML/JS.
---

# Unhappy Path

Generated UI is built against perfect data: the request returns instantly,
the list has exactly three items, every name is "Jane Cooper", and nothing
fails. Real users meet the other states first: a blank screen while data
loads, a raw `undefined`, a 40-character surname that breaks the card, a
spinner that never stops. This skill makes those states part of the build,
not a follow-up ticket.

Follow the steps in order. The happy path is the last state you finish, not
the first.

## Step 0 - Read how the project already does it

Before inventing a pattern, grep for the one the project has:

- Data layer: `useQuery` / `useSWR` / `createResource` / loaders / `fetch` wrappers.
  Their `isLoading`, `error`, `isFetching`, `data` fields are the states you must render.
- Existing pieces: `Skeleton`, `EmptyState`, `ErrorBoundary`, `error.tsx`,
  `loading.tsx`, `Suspense`, toast helpers, `<Alert>`.
- Copy tone: read two existing error messages and match them.

Reuse what exists. A second, different empty-state component is a regression.

## Step 1 - Write the state list before the code

For each component that touches data, list which of these apply. Write it in
the reply as one line per state, so the user can see what was covered:

| State | Ask |
|---|---|
| **Loading** | First load? Refetch with stale data on screen? |
| **Empty** | First use (nothing yet) vs. no results (filter/search) vs. cleared (user deleted all)? These need different copy. |
| **Error** | Network down, 4xx (your fault), 5xx (our fault), timeout. Can the user retry? Is their input kept? |
| **Partial** | Some fields `null`, missing image, one widget failed while others loaded. |
| **Overflow** | Long words, long names, 7-digit numbers, 10,000 rows, 1 row, 1 character. |
| **Slow / offline** | Request takes 8 s. Connection drops mid-submit. Double-click on submit. |
| **Permission** | Logged out, no access to this item, read-only role, feature disabled. |
| **Success after action** | What changes on screen after save/delete? Is it undoable? |

Skip a state only with a reason ("static content, never empty"). Saying
nothing means you forgot it.

## Step 2 - Build each state for real

Read `references/states.md` for the pattern per state. The rules that matter
most:

1. **Loading keeps the layout.** A skeleton shaped like the real content,
   not a centered spinner that makes the page jump. Delay showing it ~300 ms
   so fast responses never flash. Refetches keep old data visible with a
   subtle indicator.
2. **Empty states tell the user what to do next.** One sentence on why it is
   empty, one primary action. "No results for 'acme'" plus "Clear filters",
   never just "No data".
3. **Errors say what happened, what the user can do, and keep their work.**
   Retry button for transient failures. Form input survives a failed submit.
   Never show a stack trace, `[object Object]`, or "Something went wrong" alone.
4. **Never render `undefined`, `null`, `NaN`, or `Invalid Date`.** Every
   optional field has a fallback (a dash, "Not set", an initials avatar).
5. **Text can be any length.** Every user-supplied string has a decided
   behavior: wrap (`overflow-wrap: anywhere`), clamp with `line-clamp`, or
   truncate with the full value in a `title`/tooltip. Flex children that hold
   text need `min-width: 0`.
6. **Actions are safe under a slow network.** Disable submit while pending,
   show progress in the button, make the request idempotent or guard double
   submits, and handle the response arriving after the user navigated away.
7. **State changes are announced.** Errors go in `role="alert"`, loading
   regions get `aria-busy="true"`, async results go in an `aria-live="polite"`
   region. Move focus to the error summary on a failed submit.

Use `references/copy.md` for the wording of each state.

## Step 3 - Attack it with hostile data

Do not test with the sample data you wrote. Generate the hostile variants
from one real-looking record:

```bash
node scripts/fixtures.mjs sample.json > fixtures.json
```

It returns named variants: `empty`, `one`, `many`, `nulls`, `long`, `rtl`,
`emoji`, `huge-numbers`, `xss`, and more (see `references/hostile-data.md`).
Wire them into the component (story, test, or a temporary dev route) and look
at each one. Then render one component across every state side by side:

```bash
node scripts/matrix.mjs fixtures.json --component path/to/render.mjs > states.html
```

## Step 4 - Scan before handing over

```bash
node scripts/scan.mjs src/
```

It flags, with `file:line` and a fix: data fetching with no loading or error
branch, `.map()` with no empty check, `await` with no `catch`, submit
handlers with no pending guard, and text containers with no overflow rule.
It is a heuristic: fix what is real, and say in the reply which findings you
judged false positives and why. Exit code is 1 when anything is found.

## Delivering

End the reply with the state list from Step 1, marked done or skipped with
a reason, plus anything you could not test (for example: "offline state
not checked in a real browser").

## Working with ahmed-ui-craft and ui-slop

This skill covers whether the UI holds up; `ahmed-ui-craft` covers how it
looks, and `ui-slop` scores how generated it reads. If they are installed,
use the project's tokens and the craft skill's components for every state,
so the error and empty states look like they belong to the same product.
