# Security

Report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on this repo. Do not open a public issue.

In scope: anything in `skills/unhappy-path/scripts/` (these run on users' machines
when the skill is used), the CI workflow, and instructions in `SKILL.md` or
`references/` that would lead an agent to write insecure code or run unsafe commands.
`matrix.mjs` imports and runs the render module you pass it; only pass your own code.

You will get a reply within 7 days. Only the latest release is supported.
