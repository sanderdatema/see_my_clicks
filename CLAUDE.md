# Publishing

We use alpha versioning during development. Check the current version in `package.json` and pick the next unreleased version with an `-alpha.N` suffix. Increment the alpha build number on each push (e.g. `alpha.1` -> `alpha.2`). Include the version bump in the same push.

Follow semver strictly when choosing the version:
- **Patch** (1.2.x): bug fixes only — no new features, no UI changes
- **Minor** (1.x.0): new features, UI improvements, behavior changes
- **Major** (x.0.0): breaking changes to the plugin API or config

If the alpha series started as a patch but new features were added, bump to the next minor for the stable release. Semver ordering handles this fine (e.g. `1.2.4-alpha.5 < 1.3.0`).

**Do not push or publish unless the user explicitly asks.** Commit locally, but wait for the user to say "push", "release", or similar before running `git push`.

When the user asks for a stable release, drop the alpha suffix, commit, tag, and push.

Publishing happens via GitHub Actions (`.github/workflows/publish.yml`):
- **Alpha**: Every push to `main` automatically publishes with `--tag alpha` dist-tag. Can also be triggered manually via Actions > "Publish to npm" > "Run workflow".
- **Stable**: Push a `v*` tag (e.g. `git tag v1.2.0 && git push origin v1.2.0`). Publishes with the default `latest` dist-tag.

Authentication uses npm Trusted Publishing (OIDC) — no secrets needed. Trusted publishing must be configured on npmjs.com for the `see-my-clicks` package.
