# Staging environment

| Layer | Production | Staging |
|---|---|---|
| Git | `main` | `staging` |
| Xano | branch `production` (live) | branch `staging` |
| Admin panel (Vercel) | Production deployment | Preview deployment of git branch `staging` |
| Extension | `swiftcv-v<ver>.zip` | `swiftcv-staging-v<ver>.zip` ("SwiftCV (Staging)") |

## How the Xano side works
* A non-live branch is reached by appending `:<branch>` to the API group id:
  `https://api.shsws-solutions.com/api:caf8Eo15:staging/resume/generate` (live: `.../api:caf8Eo15/...`).
* **Branches copy logic only (APIs, functions, tasks). Tables and data are SHARED with production.**
  Staging therefore reads/writes the production database (users, credit balances, logs) unless a separate
  Xano *data source* (e.g. `test`) is created and selected with the `X-Data-Source: test` header.
  Schema changes pushed to any branch also change the shared tables immediately.
* Workspace environment variables (Anthropic key, payment keys, ...) are shared by all branches.
* Inside Xano code, `$env.$branch` / `$env.$datasource` give the current branch / data source. The legacy-generate
  proxy and the payment webhook URL use them so staging never calls into the live branch.

## Config (env vars, nothing hard-coded)
Admin panel — server side, read in `admin-panel/src/config/xano.ts`:

| Var | Production | Staging |
|---|---|---|
| `XANO_HOST` | `https://api.shsws-solutions.com` | same |
| `XANO_BRANCH` | *(empty = live)* | `staging` |
| `XANO_DATA_SOURCE` | *(empty = live)* | `test` (only once the data source exists) |
| `NEXT_PUBLIC_SITE_URL` | `https://hhq.vfprints.store` | the staging domain |

Set them in Vercel → Project → Settings → Environment Variables:
Production = the first column; **Preview, restricted to Git branch `staging`** = the second column.
Safety net: a Vercel deploy of git branch `staging` defaults `XANO_BRANCH` to `staging` even if it is unset.

Extension — the source always holds the production URLs; the environment is chosen when packaging:

```
scripts/package-extension.sh swiftcv --env staging     # -> dist/swiftcv-staging-v<ver>.zip
scripts/package-extension.sh swiftcv                    # -> dist/swiftcv-v<ver>.zip (production)
npm run build:extensions:staging
```
The staging build rewrites every `https://api.shsws-solutions.com/api:<group>` to `...:staging`, renames the
extension "(Staging)" and fails if any URL is left unrewritten (or if a prod build contains a branch URL).
The extension cannot send an `X-Data-Source` header, so extension traffic uses the live data source.

## Release flow
1. Work on a feature branch, merge into `staging`. Push `staging` -> Vercel builds the staging admin panel.
2. `scripts/xano-deploy.sh staging` pushes the same files to the Xano `staging` branch.
3. Test with the admin panel preview + the staging extension zip.
4. Merge `staging` into `main` (Vercel deploys production), then `scripts/xano-deploy.sh production`
   (requires branch `main`, clean tree, a dry run and a typed confirmation).
Rollback: `xano branch set_live <previous-branch> -w 1 --force`, or re-push the previous commit.
