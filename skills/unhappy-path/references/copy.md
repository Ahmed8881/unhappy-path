# Copy for each state

Good state copy answers: what happened, why (if it helps), what to do now.
Match the product's existing tone; these are defaults.

## Rules

- Say what happened in plain words. "We couldn't load your invoices", not
  "An error occurred".
- Blame the system, not the user, unless it really is their input, and then
  say exactly what to change.
- One action, labeled with a verb: "Retry", "Clear filters", "Create invoice".
- No "Oops", "Uh oh", "Whoops", exclamation marks, or jokes on errors. The
  user is already annoyed.
- No raw codes as the message. A code can go in small text for support:
  "Error ref: 7F3A".
- Keep the user's words: echo their search query, keep their file name.

## Replacements

| Instead of | Write |
|---|---|
| No data | No invoices yet. Invoices you send will show up here. **[Create invoice]** |
| No results found | No results for "acme". Check the spelling or **[clear filters]**. |
| Something went wrong | We couldn't load your invoices. Check your connection and **[retry]**. |
| Error 500 | Our server had a problem saving this. Your changes are still here. **[Try again]** |
| Invalid input | Enter a date after today. |
| Unauthorized | Your session ended. **[Sign in]** to pick up where you left off. |
| Forbidden | You don't have access to "Q3 Budget". Ask the owner, Sara, to share it. |
| Not found | This invoice was deleted or the link is wrong. **[Back to invoices]** |
| Network Error | You're offline. We'll save your changes when you're back online. |
| Loading... | Loading invoices (visually hidden; the skeleton is the visible part) |
| Success! | Invoice sent to dana@example.com. **[Undo]** |
| Are you sure? | Delete "Q3 report"? This can't be undone. **[Delete report]** **[Cancel]** |

## Field validation

- Say the rule, not the failure: "Use at least 8 characters", not
  "Password invalid".
- Validate on blur or submit, not on every keystroke while the user is
  still typing.
- Put the message under the field, and keep it until the value is fixed.

## Empty-state structure

```
[optional small illustration or icon, decorative: alt=""]
Heading: what's empty, in their words     "No projects yet"
Body: one line on why or what goes here   "Projects group your tasks and files."
Primary action                            [New project]
Optional secondary                        Import from CSV
```
