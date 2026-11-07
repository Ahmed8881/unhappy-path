# State patterns

One section per state: what to render, the code shape, and the trap.

## Loading

- **First load**: skeleton with the real layout's shape (same heights, same
  column count). Use `aria-busy="true"` on the region and one visually hidden
  "Loading orders" label, not one per skeleton bar.
- **Delay**: show nothing for the first ~300 ms, then the skeleton. Once shown,
  keep it at least ~400 ms so it does not flicker.
- **Refetch / pagination**: keep the old data, dim it or show a thin progress
  bar. Never swap back to the full skeleton.
- **Buttons**: label changes ("Saving…"), button disabled, width does not jump.
- **Trap**: `if (!data) return <Spinner/>` also catches the error case, so
  failures spin forever. Check `error` before `!data`.

```tsx
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (isLoading) return <OrdersSkeleton />;
if (!data.length) return <OrdersEmpty />;
return <OrdersTable rows={data} stale={isFetching} />;
```

Order matters: error, loading, empty, data.

## Empty

Three different empties need three different screens:

| Kind | Cause | Show |
|---|---|---|
| First use | User has never created one | What this is for + primary "Create" action, maybe a sample |
| No results | Search or filter matched nothing | Echo the query + "Clear filters" |
| Cleared | User deleted or finished everything | Short confirmation ("All caught up") |

- **Trap**: `items.length === 0` before the data has loaded shows "No orders"
  for a split second. Only decide "empty" after loading finished.

## Error

- **Inline field errors** for validation: next to the field, linked with
  `aria-describedby`, `aria-invalid="true"`. Summary at the top on submit,
  focus moved to it.
- **Section errors** when one widget fails: that card shows the error and a
  retry; the rest of the page keeps working. Use an error boundary per region,
  not one for the whole app.
- **Page errors** for 404/403/500: say which one in plain words, offer a way
  out (back, home, sign in).
- **Map status to message**: 400/422 = their input (show field errors),
  401 = sign in again, 403 = no access, 404 = gone or never existed,
  409 = someone else changed it, 429 = slow down, 5xx/timeout = our side,
  retry. `TypeError: Failed to fetch` = offline.
- **Keep input**: never reset a form on failure.
- **Trap**: `catch (e) { console.error(e) }` swallows it and the UI shows
  stale success. Every `catch` must set a visible state.

## Partial

- Every optional field gets a fallback: `—` for numbers, "Not set" for
  settings, initials avatar for missing images (`onError` on `<img>`).
- Format with guards: `Intl.NumberFormat`, `Intl.DateTimeFormat`, and check
  `Number.isFinite` / valid dates first.
- Dashboards: each widget loads and fails on its own.

## Overflow

- Long words and URLs: `overflow-wrap: anywhere`.
- Names in cards and table cells: `text-overflow: ellipsis` +
  `white-space: nowrap` + `overflow: hidden` + full value in `title`.
- Multi-line descriptions: `display: -webkit-box; -webkit-line-clamp: 3;`
  (or `line-clamp: 3`) with a "Show more".
- Flex/grid children holding text: `min-width: 0`.
- Numbers: `Intl.NumberFormat(locale, { notation: "compact" })` for tight
  spaces, `font-variant-numeric: tabular-nums` in tables.
- Big lists: paginate or virtualize above a few hundred rows; show a count.
- One item: check the grid still looks intended with a single card.

## Slow and offline

- **Double submit**: disable while pending and guard in the handler.
- **Race**: ignore stale responses (`AbortController`, or compare a request
  id) so an old search result never overwrites a newer one.
- **Unmounted**: abort the request in the effect cleanup.
- **Offline**: `navigator.onLine` + `online`/`offline` events for a banner;
  queue or block writes; say clearly that the change was not saved.
- **Timeouts**: `AbortSignal.timeout(15000)` and a message after it fires.
- **Optimistic updates**: roll back and tell the user when the server says no.

## Permission

- Hide actions the user can never take; disable (with a reason in a tooltip)
  actions they could take after an upgrade or a role change.
- 401 mid-session: keep the page state, ask them to sign in, come back.
- 403 on a direct link: "You don't have access to this project" plus who to
  ask, never a blank page or a 404 that hides it.

## Success after action

- Show the result where the user is looking: the row updates, the item
  appears, a toast confirms off-screen changes.
- Destructive actions: undo for a few seconds beats "Are you sure?".
- Announce with `aria-live="polite"`.
