# Infrastructure

WAL-GO uses [Alchemy v2](https://alchemy.run) for infrastructure-as-code on Cloudflare + PlanetScale.

## Environments

| Stage | Trigger | Database | Worker |
|---|---|---|---|
| `prod` | push to `main` | PlanetScale `main` branch | Cloudflare Worker |
| `pr-{N}` | PR opened/updated | PlanetScale `pr-{N}` branch | Preview Worker |

PR environments are automatically destroyed when the PR is closed.

## Stack

- **Cloudflare Workers** — server runtime (TanStack Start SSR)
- **PlanetScale PostgreSQL** — managed Postgres with per-PR branch isolation
- **Cloudflare Hyperdrive** — connection pooler between Worker and PlanetScale

## Configuration (`packages/infra/alchemy.run.ts`)

The stack creates:

1. `PostgresDatabase` — single shared PlanetScale database (`wal-go`, `PS_5` cluster in `eu-central`). Marked `RemovalPolicy.retain(true)` — see [Shared database is destroy-protected](#shared-database-is-destroy-protected) below.
2. `PostgresBranch` — isolated branch per PR stage; prod uses `main` directly
3. `PostgresRole` — credentials with `postgres` inherited role; `.origin` wires directly into Hyperdrive
4. `Hyperdrive` — pools connections; uses the unique logical id `hyperdrive` so it does not collide with the PlanetScale database resource; `dev` override points to `localhost:5432` for `alchemy dev`
5. `Drizzle.Schema` — generates migration SQL using drizzle-kit's programmatic API whenever the schema in `packages/db/src/schema/` changes; migrations are written to `packages/db/migrations/`
6. `Vite` — deploys the web app as a Worker with `HYPERDRIVE` binding, a direct `DATABASE_URL` secret from the PlanetScale role, and `nodejs_compat_populate_process_env` so Worker variables/secrets are available through `process.env`. `memo.include` is set to `../../apps/**` and `../../packages/**` so changes to any workspace package trigger a rebuild — Alchemy's default hashes only the `packages/infra` cwd.
7. `GitHub.Comment` — posts a preview-URL comment on the PR. Only created when `PULL_REQUEST` is set.

### GitHub provider is conditional

`ghProviders()` resolves GitHub credentials **eagerly** when the provider layer is built — if no `GITHUB_TOKEN`/`GITHUB_ACCESS_TOKEN` is in the environment it fails immediately with `Failed to resolve GitHub credentials for profile 'default'`, regardless of whether a comment is actually posted. The stack therefore loads the GitHub provider only when `PULL_REQUEST` is set (i.e. CI PR deploy/cleanup). Local `alchemy deploy`/`destroy` runs without `PULL_REQUEST` skip the provider entirely and need no token.

Because the cleanup job destroys the `Comment` resource from state, it also sets `PULL_REQUEST`, so it must pass `GITHUB_TOKEN` too (both the deploy and cleanup jobs do).

### Shared database is destroy-protected

The `PostgresDatabase` is **one physical database (`wal-go`) shared by every stage** — only the *branch* is per-PR. Each stage's state still holds its own `db` resource handle pointing at that same physical database, all with `removalPolicy: "destroy"` by default. That means `alchemy destroy` on **any** stage — including a preview PR — issues a PlanetScale `DELETE database` and wipes prod data. This actually happened once: a preview-stage destroy deleted the production database.

The fix: the `db` resource is wrapped with `RemovalPolicy.retain(true)` in `alchemy.run.ts`. `destroy` now removes it from Alchemy state only and never calls the PlanetScale delete API; the database survives. To genuinely delete it, do so manually in the PlanetScale dashboard.

`PostgresBranch` keeps the default `destroy` policy on purpose — preview branches *should* be torn down on PR close; only the shared database is protected.

## Local development

Two modes:

### `vite dev` (Node.js, pure local)

```sh
pnpm dev  # from apps/web
```

Runs entirely in Node.js. Uses `DATABASE_URL` from `apps/web/.env` directly. No Cloudflare dependency.

### `alchemy dev` (workerd, Hyperdrive dev override)

```sh
cd packages/infra && pnpm dev
```

Runs the Worker in workerd. Hyperdrive `dev` override connects to local Postgres at `localhost:5432`. Requires a local Postgres instance.

## Migrations

Drizzle migrations are managed by Alchemy via the `Drizzle.Schema` resource in `packages/infra/alchemy.run.ts`. On every deploy, alchemy compares the current schema against the latest snapshot and generates a new migration SQL file if anything changed.

Migration files live in `packages/db/migrations/` in the format `{timestamp}_migration/migration.sql` + `snapshot.json`. These should be committed to git. Both `alchemy deploy` and the `drizzle-kit` CLI scripts in `packages/db` use this directory.

Migrations are applied automatically on deploy:
- **prod** (`main` branch): applied via `PostgresDatabase.migrationsDir`
- **PR preview** (`pr-{N}` branch): applied via `PostgresBranch.migrationsDir`

The migrations table (`__drizzle_migrations`) is created automatically in each database branch and tracks which migrations have been applied (by filename), so each migration only runs once.

To add a migration: modify the schema in `packages/db/src/schema/`, then deploy. Alchemy generates and applies the migration automatically.

## Database connection

`createDb()` in `packages/db/src/index.ts` accepts an optional `connectionString`:
- In deployed Workers: the Worker receives both `HYPERDRIVE` and `DATABASE_URL`. `HYPERDRIVE` is preferred so connections are pooled server-side; `DATABASE_URL` is a direct-connection fallback for environments without Hyperdrive. Because `DATABASE_URL` is also bound on the Worker (`alchemy.run.ts`), a missing/empty `HYPERDRIVE` binding makes the Worker silently connect directly. Note: Hyperdrive-pooled connections still appear in PlanetScale as `application_name = postgres.js` (Hyperdrive passes the client name through, it does not relabel to `Cloudflare Hyperdrive`), so the application name alone does not distinguish pooled from direct — check `usename` and connection lifetime instead.
- In `alchemy dev`: Hyperdrive's `dev` override connects to local Postgres at `localhost:5432` unless a `DATABASE_URL` is present in the local environment.
- In Node.js (`vite dev`): no Hyperdrive binding exists, so database clients fall back to `process.env.DATABASE_URL`

The context layer (`packages/api/src/context.ts`) resolves this automatically.

## Production debugging

Cloudflare Workers do not expose a long-running Node.js process console. Use Workers Logs instead:

```sh
pnpm --dir apps/web exec wrangler tail wal-go-web-prod-qpklntmn3zhnzpcb --format pretty
```

Then reproduce the request, for example by loading `https://walgo.lt/`. `console.error` output from the Worker appears in the tail stream and in Cloudflare Workers Observability. The production script name changes when Alchemy recreates the Worker, so confirm the current name in the Cloudflare dashboard or from the deploy output before tailing.

For database-specific checks, query PlanetScale directly and look for Hyperdrive sessions:

```sql
SELECT DISTINCT usename, application_name
FROM pg_stat_activity
WHERE application_name = 'Cloudflare Hyperdrive';
```

If direct `DATABASE_URL` works but Hyperdrive does not, check the Hyperdrive origin host, port, database, user, password, and SSL mode in Cloudflare, then compare them with the current PlanetScale role values.

## Deployment

CI deploys via GitHub Actions (`.github/workflows/deploy.yml`).

Required GitHub secrets:

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `PLANETSCALE_API_TOKEN_ID` | PlanetScale API token ID |
| `PLANETSCALE_API_TOKEN` | PlanetScale API token |
| `PLANETSCALE_ORGANIZATION` | PlanetScale organization slug |
| `BETTER_AUTH_SECRET` | better-auth secret key |
| `GITHUB_TOKEN` | Token for posting/destroying PR preview comments (auto-provided by Actions) |

The Cloudflare token must be the raw API token value, not the token ID and not an `Authorization` header value. Store `abc...` in `CLOUDFLARE_API_TOKEN`, not `Bearer abc...`. It must be scoped to the account in `CLOUDFLARE_ACCOUNT_ID` and allow:

- Account Settings: Read
- Workers Scripts: Edit
- Hyperdrive: Edit
- Secrets Store: Edit (or Secrets Store Read + Write if Cloudflare shows split permissions)

The deploy workflow follows Alchemy's recommended GitHub Actions shape: it defines a top-level `STAGE`, uses `deploy-${{ github.ref }}` concurrency with `cancel-in-progress: false`, grants `contents: read` and `pull-requests: write`, and runs deploy for non-closed events. `STAGE` is `prod` on `main`, `pr-{N}` for pull requests, and falls back to the branch name for other push refs.

The deploy and destroy commands call `pnpm exec alchemy ...` directly from `packages/infra` and pass `--yes` because GitHub Actions is non-interactive. Root `pnpm deploy` and `pnpm destroy` also bypass Turbo and call the Alchemy CLI directly so flags like `--yes` and `--stage` are parsed by Alchemy. Cleanup runs only for closed pull requests and includes a safety check that refuses to destroy `prod`.

The PlanetScale token must be a service token. Store the service token ID in `PLANETSCALE_API_TOKEN_ID` and the service token value in `PLANETSCALE_API_TOKEN`; PlanetScale authenticates API requests with an `Authorization` header in the `<SERVICE_TOKEN_ID>:<SERVICE_TOKEN>` format. The token must be scoped to the organization in `PLANETSCALE_ORGANIZATION`.

Required PlanetScale access:

- Organization access: `create_databases`
- Database access for all current and future databases, or at least for `wal-go`: `read_database`, `write_database`, `read_branch`, `create_branch`, `delete_branch`, `connect_branch`, `connect_production_branch`, `create_branch_password`, `create_production_branch_password`, `delete_branch_password`, `delete_production_branch_password`

`write_database` is required because Alchemy reconciles PlanetScale database settings with the `PATCH /organizations/{organization}/databases/{database}` endpoint. Password permissions are required because `PostgresRole` creates and deletes branch role credentials for Hyperdrive.

Required GitHub variables:

| Variable | Description |
|---|---|
| `CORS_ORIGIN` | Allowed CORS origin |
| `BETTER_AUTH_URL` | Public URL for better-auth |

## Local infra credentials

Alchemy stores Cloudflare credentials in `~/.alchemy/profiles.json` after `alchemy login`. PlanetScale credentials go in `packages/infra/.env`:

```
PLANETSCALE_API_TOKEN_ID=
PLANETSCALE_API_TOKEN=
PLANETSCALE_ORGANIZATION=
BETTER_AUTH_SECRET=
CORS_ORIGIN=
BETTER_AUTH_URL=
```

## Preview lifecycle & manual recovery

### How previews are torn down

When a PR is closed, the `cleanup` job in `deploy.yml` runs `alchemy destroy --stage pr-{N}`. It:

- aborts unless the stage matches `pr-<number>` (Safety Check) — it can never destroy `prod` or a branch stage;
- retries up to 3 times (destroy is idempotent, so re-runs resume);
- removes only the preview **branch** and preview **worker**. The shared database is `RemovalPolicy.retain(true)`, so destroy never deletes it.

### What is safe vs. dangerous

| Action | Effect |
|---|---|
| `alchemy destroy --stage pr-{N}` | Safe. Deletes the preview branch + worker. The shared db is retained. |
| `alchemy destroy --stage prod` | Removes the prod worker/role/hyperdrive (recoverable by re-deploy). **The db is retained** thanks to `RemovalPolicy.retain(true)`, but never do this on purpose. |
| Deleting a PlanetScale **branch** (dashboard/API) | Safe. A branch is an isolated copy; `main` is a protected production branch and cannot be deleted without demoting it first. |
| Deleting the **database** in the PlanetScale dashboard | Destroys production data. The only path that can; never automated. |

Before the `RemovalPolicy.retain(true)` guard, a manual `alchemy destroy` on a preview deleted the shared production database — because PlanetScale databases carry no ownership tags, so Alchemy treated the same physical `wal-go` db as owned in every stage. The guard is what prevents recurrence; keep it.

### When CI cleanup fails and you must fix things manually

1. **Inspect state** (read-only):
   ```sh
   cd packages/infra
   alchemy state stages WAL-GO              # list stages
   alchemy state resources WAL-GO pr-123    # resources in a stage
   alchemy state get WAL-GO pr-123 db-branch
   ```
2. **Destroy a stuck preview** (safe — db is retained):
   ```sh
   alchemy destroy --yes --stage pr-123
   ```
   Needs `CLOUDFLARE_API_TOKEN` (or `alchemy login`) and the PlanetScale vars from `.env`. No `GITHUB_TOKEN` needed unless the stage still has a PR `Comment` resource (set `PULL_REQUEST=123` if so).
3. **Partial / errored destroy:** just re-run the same `destroy` — it continues from the remaining resources.
4. **State drift** (you changed something in the cloud by hand): re-import instead of fighting it:
   ```sh
   alchemy deploy --adopt --stage pr-123
   ```
   `--adopt` takes over pre-existing cloud resources into state.
5. **Orphaned PlanetScale branches** (preview branch left behind but stage gone from state): delete the branch directly in the PlanetScale dashboard or API. This is safe — deleting a branch is not deleting the database, and `main` is protection-guarded.
6. **Never** delete the `wal-go` database or demote/delete the `main` branch to "clean up". If the database itself is ever gone, recovery is a PlanetScale support restore, not a redeploy (a redeploy only recreates an empty db).
