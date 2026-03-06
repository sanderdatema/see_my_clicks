Release and publish workflow for see-my-clicks.

## Versioning

Check the current version in `package.json` and pick the next unreleased version.

- Use `-alpha.N` suffix during development. Increment the alpha build number on each push (e.g. `alpha.1` -> `alpha.2`).
- Include the version bump in the same commit as the code changes.

Follow semver strictly:
- **Patch** (1.2.x): bug fixes only — no new features, no UI changes
- **Minor** (1.x.0): new features, UI improvements, behavior changes
- **Major** (x.0.0): breaking changes to the plugin API or config

If the alpha series started as a patch but new features were added, bump to the next minor for the stable release. Semver ordering handles this fine (e.g. `1.2.4-alpha.5 < 1.3.0`).

## Alpha Release

1. Bump version in `package.json` with the next `-alpha.N` suffix.
2. Commit the changes.
3. Wait for user to explicitly say "push" before running `git push`.
4. GitHub Actions auto-publishes with `--tag alpha` on push to `main`.

## Stable Release

1. Drop the `-alpha.N` suffix from the version in `package.json`.
2. Commit and tag: `git tag v<version>`.
3. Wait for user to explicitly say "push" before running `git push && git push origin v<version>`.
4. The `v*` tag triggers GitHub Actions to publish with the default `latest` dist-tag.

## Infrastructure

- Publishing workflow: `.github/workflows/publish.yml`
- Authentication: npm Trusted Publishing (OIDC) — no secrets needed. Must be configured on npmjs.com for the `see-my-clicks` package.
- Manual trigger: Actions > "Publish to npm" > "Run workflow".
