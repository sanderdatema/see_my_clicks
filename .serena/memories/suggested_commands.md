# Suggested Commands

## Development
There is no dev server for this package itself — it's tested by using it in another project.

## Testing
```bash
npm test          # Currently just echoes "No tests yet"
```

## Publishing
- **Alpha**: Every push to `main` auto-publishes with `--tag alpha`
- **Stable**: Tag and push: `git tag v1.2.1 && git push origin v1.2.1`
- When user confirms a fix works, immediately publish stable (drop alpha suffix, commit, tag, push)

## Version Bumping
- During development: `1.x.y-alpha.N`, increment N on each push
- Stable: drop `-alpha.N` suffix

## Useful Commands
```bash
npm pack                    # Create tarball to inspect package contents
npm view see-my-clicks      # Check published package info
gh run list                 # Check GitHub Actions publish status
gh run view <id>            # View specific workflow run
```

## System (Darwin)
```bash
git, ls, find, grep         # Standard unix tools (macOS versions)
```
