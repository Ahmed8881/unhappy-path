# Contributing

Thanks for helping. Good first contributions: a `scan.mjs` false positive or
missed case with a minimal code sample, a new hostile data variant, or better
copy in `references/copy.md`.

## Workflow

1. Fork, branch, and open a pull request against `main`. Direct pushes are blocked.
2. CI must pass. Run the same checks locally first (Node 20+, no install needed):

   ```bash
   node .github/lint-skill.mjs
   cd skills/unhappy-path
   node scripts/scan.mjs --test
   node scripts/fixtures.mjs --test
   node scripts/matrix.mjs --test
   cd ../..
   node skills/unhappy-path/scripts/scan.mjs evals/fixtures/good   # must be clean
   node skills/unhappy-path/scripts/scan.mjs evals/fixtures/bad    # must exit 1
   ```

3. If you change behavior, add a line to `CHANGELOG.md`.

## Rules for scripts

- No dependencies, no network calls, no writes outside the paths the user passes in.
  These scripts run on other people's machines.
- A new or changed `scan.mjs` rule needs a self-test case for what it catches and
  one for the false positive it must not report.
- Prefer missing a case over flagging correct code: noisy findings teach people to
  ignore the scanner.

## Rules for the skill

- Keep `SKILL.md` under 400 lines and each `references/` file under 150.
- Every rule should say why, not just what.

Security issues: see `SECURITY.md`, not the issue tracker.
By contributing you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
