# Publishing

We use alpha versioning during development: `1.2.3-alpha.N`. Whenever you push to GitHub, increment the alpha build number (e.g. `alpha.1` -> `alpha.2`). Include the version bump in the same push.

When the user confirms a fix or feature works (e.g. "it works", "the fix works", "tested and it works"), immediately publish a stable release: drop the alpha suffix, commit, tag, and push. Also publish stable when the user explicitly asks for a release.

Publishing happens via GitHub Actions (`.github/workflows/publish.yml`):
- **Alpha**: Every push to `main` automatically publishes with `--tag alpha` dist-tag. Can also be triggered manually via Actions > "Publish to npm" > "Run workflow".
- **Stable**: Push a `v*` tag (e.g. `git tag v1.2.0 && git push origin v1.2.0`). Publishes with the default `latest` dist-tag.

Authentication uses npm Trusted Publishing (OIDC) — no secrets needed. Trusted publishing must be configured on npmjs.com for the `see-my-clicks` package.
