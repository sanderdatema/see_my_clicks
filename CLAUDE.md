# Publishing

We use alpha versioning during development: `1.2.0-alpha.N`. Whenever you push to GitHub, increment the alpha build number (e.g. `alpha.1` -> `alpha.2`). Include the version bump in the same push.

When the user explicitly asks to publish a stable release, drop the alpha suffix and bump appropriately (patch/minor/major).

Publishing happens via GitHub Actions (`.github/workflows/publish.yml`):
- **Alpha**: Go to Actions > "Publish to npm" > "Run workflow". Publishes with `--tag alpha` dist-tag.
- **Stable**: Push a `v*` tag (e.g. `git tag v1.2.0 && git push origin v1.2.0`). Publishes with the default `latest` dist-tag.

Authentication uses npm Trusted Publishing (OIDC) — no secrets needed. Trusted publishing must be configured on npmjs.com for the `see-my-clicks` package.
