# Hostile data

The variants `scripts/fixtures.mjs` generates, and what each one breaks.
Run it on one realistic record (or an array of them):

```bash
node scripts/fixtures.mjs sample.json            # all variants as JSON
node scripts/fixtures.mjs sample.json --only long,nulls
```

| Variant | What it does to the data | What it catches |
|---|---|---|
| `empty` | `[]` | Missing empty state, "No data" flash |
| `one` | a single record | Grids that only look right with 3+ items, plural copy ("1 items") |
| `many` | 1,000 records | No pagination or virtualization, slow renders, missing counts |
| `nulls` | every field `null` | `undefined`/`null` rendered, crashes on `.toUpperCase()` |
| `missing` | every field removed | Optional chaining gaps, `Invalid Date` |
| `blank` | every string `""` | Collapsed rows, empty links, avatars with no initials |
| `long` | every string a long word + long sentence | Layout breaks, missing truncation |
| `rtl` | Arabic and Hebrew strings | Mirrored layout, icons on the wrong side, `dir` missing |
| `emoji` | emoji incl. ZWJ sequences and flags | Broken `.slice()` truncation, counting by UTF-16 length |
| `accents` | combining marks and CJK | Font fallback, line height, sort order |
| `huge-numbers` | numbers near `Number.MAX_SAFE_INTEGER`, negatives, decimals | Overflowing cells, no formatting, `-` signs, float noise |
| `zero` | numbers `0`, booleans `false` | `{count && ...}` rendering a literal `0`, falsy checks hiding real values |
| `xss` | `<img src=x onerror=alert(1)>` and friends | `innerHTML` / `dangerouslySetInnerHTML` / `v-html` with user data |
| `whitespace` | leading/trailing spaces, newlines, tabs | Untrimmed input, newline in single-line cells |

Dates: strings that parse as dates get `"not-a-date"` in `nulls`-style
variants and far past/future values in `huge-numbers`.

## Beyond data

These are not data variants, check them by hand:

- **Slow network**: browser devtools "Slow 3G", or add `await new
  Promise(r => setTimeout(r, 3000))` in the fetcher temporarily.
- **Failure**: make the fetcher throw, or return a 500 from a mock.
- **Offline**: devtools "Offline", then submit a form.
- **Narrow**: 320 px wide with the `long` variant.
- **Zoom**: 200% browser zoom.
- **Keyboard only**: reach and trigger the retry and empty-state actions.
