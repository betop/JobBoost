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

## Test data source (created 2026-10-14)
A Xano data source named `test` exists (amber in the Xano footer). Select it per request with the header
`X-Data-Source: test` (the admin panel always does this on a non-live branch: `XANO_DATA_SOURCE` unset or `live` is forced to `test`). It has the same schema as `live`
but starts EMPTY: copy live data with Xano's own tool - dashboard -> status footer -> data source indicator ->
**Manage Data Sources -> Migrate** -> source `live`, destination `test`, select all tables -> confirm. The Meta API has
no migrate endpoint, and the credential tables (`users` password hashes, `access_token` keys) should be copied
server-side by that tool rather than through a client. Re-run Migrate whenever staging data should be refreshed.
Never run Migrate in the test -> live direction. `XANO_DATA_SOURCE` set to a name that does not exist makes every
request fail with "Invalid data source."

Seeded staging login (test data source only; not present in live): `staging-admin@fo-star.com`, type `super_admin`,
password known to the project owner (not stored in the repo). Its email differs from every live account so a later
Migrate cannot collide on the unique email. When inserting users through the Meta API, send the same fields as
`auth/register` does (note the column is `password_hash`, and `profile_ids` / `assigned_bidder_ids` must be sent,
even empty) - otherwise Postgres rejects the row with `22P02 INVALID TEXT REPRESENTATION`.

**Raw SQL ignores the data source.** `db.direct_query` always runs against the table names written in the SQL and
ignores `X-Data-Source`. Live tables are `x1_<table id>`, other data sources `x1_<data source>_<table id>`
(`x1_test_7`). Every raw query must therefore go through `function.run "db/sql_for_datasource"` first (it rewrites the
prefix from `$env.$datasource`); otherwise staging endpoints silently read/write LIVE data. Currently used by
logs/list, logs/mail_triage(_logs), users list, dashboard/usage_pricing and functions/logs/can_access_log.
Check any new endpoint with the `test` data source: it must return `test` data, not live data.

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
The staging build also prepends a `fetch` wrapper to every extension script that calls the API, adding
`X-Data-Source: test` (Xano CORS allows any header), so the staging extension reads/writes ONLY test data.
The build fails if an API-calling script lacks the wrapper (or if a prod build contains it). Access keys and
profiles must exist in the `test` data source (Migrate) for the staging extension to log in.

## Release flow
1. Work on a feature branch, merge into `staging`. Push `staging` -> Vercel builds the staging admin panel.
2. `scripts/xano-deploy.sh staging` pushes the same files to the Xano `staging` branch.
3. Test with the admin panel preview + the staging extension zip.
4. Merge `staging` into `main` (Vercel deploys production), then `scripts/xano-deploy.sh production`
   (requires branch `main`, clean tree, a dry run and a typed confirmation).
Rollback: `xano branch set_live <previous-branch> -w 1 --force`, or re-push the previous commit.
