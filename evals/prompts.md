# Eval prompts

Run each prompt twice in a fresh Claude Code session: once without the skill
(baseline) and once with it. Save outputs under `evals/runs/<baseline|with-skill>/`,
then score each output against the checklist and with `scan.mjs`.

## Prompts

1. "Build a React component that lists the user's invoices from `/api/invoices`."
2. "Add a search box to filter the products table." (give it an existing table)
3. "Make a profile page showing name, email, avatar, bio, and join date from `/api/me`."
4. "Build a file upload form with a submit button that posts to `/api/upload`."
5. "Build a dashboard with three widgets: revenue, active users, recent orders."

## Checklist (one point each)

| # | Check |
|---|---|
| 1 | Loading state that keeps the layout (skeleton, not a bare spinner) |
| 2 | Error state with a plain-language message and a retry action |
| 3 | Empty state with a next action (first-use and no-results differ where both apply) |
| 4 | Error checked before loading/empty, so failures never spin forever |
| 5 | No `undefined` / `null` / `Invalid Date` reachable for optional fields |
| 6 | Long text has a wrap or truncate rule |
| 7 | Submit disabled while pending; input kept on failure |
| 8 | Async changes announced (`role="alert"`, `aria-live`, `aria-busy`) |
| 9 | Reply lists the states covered and what was skipped |
| 10 | `scan.mjs` reports no real findings |

## Known-answer fixtures

`fixtures/bad/` must be flagged and `fixtures/good/` must be clean; CI checks both.
