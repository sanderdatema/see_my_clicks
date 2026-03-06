# Task Completion Checklist

When a task is completed:

1. **Verify the change works** — no build step needed, but check for syntax errors
2. **Bump alpha version** — increment `alpha.N` in package.json
3. **Commit** — descriptive message, include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
4. **Push to main** — triggers auto-publish of alpha to npm
5. **If user confirms it works** — immediately publish stable: drop alpha suffix, commit, tag (`v*`), push tag

## No linting/formatting/testing commands
- Prettier runs automatically (linter hook on file save)
- No test suite yet (`npm test` is a no-op)
- No build step
