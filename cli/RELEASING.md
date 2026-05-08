# Releasing `@imbrace/cli`

The CLI is published to npm via GitHub Actions on every `v*` tag push.
Workflow: [`.github/workflows/publish.yml`](../.github/workflows/publish.yml).

## One-time setup

1. **Create npm automation token**
   - https://www.npmjs.com/settings/<your-user>/tokens → "Generate New Token" → **Automation**.
   - Automation tokens bypass 2FA on publish (required for CI).
2. **Add token as a repo secret**
   - GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
   - Name: `NPM_TOKEN`. Value: the token from step 1.
3. **Confirm `@imbrace` scope ownership on npmjs.com**
   - The publishing user/org must own the `@imbrace` scope.
   - For an org scope, the publisher must be a member with publish rights.

## Cutting a release

From `imbrace-cli/cli`:

```bash
npm version patch        # 1.0.0 -> 1.0.1   (or `minor` / `major`)
git push --follow-tags
```

`npm version` does three things in one shot: bumps `package.json`, creates a
commit, and creates a `vX.Y.Z` tag. `--follow-tags` pushes the commit and the
tag together.

The workflow then:
1. Checks the tag version matches `package.json` (fails fast on mismatch).
2. Runs `npm ci` and `npm run build`.
3. Publishes with `--access public --provenance`.

## Verifying the release

- Actions tab → confirm the `Publish CLI to npm` run succeeded.
- https://www.npmjs.com/package/@imbrace/cli → new version listed, "Provenance"
  badge visible on the version page.
- Sanity check: `npx @imbrace/cli@<new-version> --version`.

## Recovering from a failed publish

- **Tag/version mismatch**: delete the tag locally and remotely, fix the
  version, retag.
  ```bash
  git tag -d v1.2.3
  git push --delete origin v1.2.3
  ```
- **`npm publish` failed mid-run** (e.g. transient registry error): npm does
  not allow re-publishing the same version. Bump to the next patch and retag.
- **Wrong contents shipped**: deprecate the bad version
  (`npm deprecate @imbrace/cli@1.2.3 "see 1.2.4"`) and publish a fix. Do not
  unpublish — it breaks downstream installs.
