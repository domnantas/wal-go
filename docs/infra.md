# Infrastructure

WAL-GO uses [Alchemy v2](https://alchemy.run) for IaC on Cloudflare + PlanetScale.

## Environments

| Stage | Trigger | Database | Worker |
|---|---|---|---|
| `prod` | push to `main` | PlanetScale `main` branch | Cloudflare Worker |
| `pr-{N}` | PR opened/updated | PlanetScale `pr-{N}` branch | Preview Worker |

PR environments are auto-destroyed when the PR closes.

## Stack

- **Cloudflare Workers** — server runtime (TanStack Start SSR).
- **PlanetScale PostgreSQL** — managed Postgres with per-PR branch isolation.
- **Cloudflare Hyperdrive** — connection pooler between Worker and PlanetScale.

## Configuration (`packages/infra/alchemy.run.ts`)

1. `PostgresDatabase` — single shared PlanetScale database (`wal-go`, `PS_5` cluster, `eu-central`). `RemovalPolicy.retain(true)` — see [destroy protection](#shared-database-is-destroy-protected).
2. `PostgresBranch` — isolated branch per PR stage; prod uses `main` directly.
3. `PostgresRole` — credentials with `postgres` inherited role; `.origin` wires into Hyperdrive. `database` is passed as the **literal name string** (`databaseName`), not the `db` resource — see [why the role takes a literal db name](#postgresrole-takes-a-literal-db-name).
4. `Hyperdrive` — pools connections; unique logical id `hyperdrive` to avoid colliding with the DB resource; `dev` override → `localhost:5432` for `alchemy dev`.
5. `Drizzle.Schema` — generates migration SQL via drizzle-kit's programmatic API when `packages/db/src/schema/` changes; output to `packages/db/migrations/`.
6. `Vite` — deploys the web app as a Worker with `HYPERDRIVE` binding and `nodejs_compat_populate_process_env` so Worker vars/secrets reach `process.env`. A direct `DATABASE_URL` secret is bound **only on preview stages** (`!isProd`); prod is Hyperdrive-only — see [why prod has no direct DATABASE_URL](#prod-has-no-direct-database_url). `memo.include` is `../../apps/**` and `../../packages/**` so any workspace change triggers a rebuild (Alchemy's default only hashes the `packages/infra` cwd).
7. `GitHub.Comment` — posts a preview-URL comment; only created in CI on a PR (`PULL_REQUEST` set **and** `CI`).

### GitHub provider is always `CommentProvider()`

The stack uses `CommentProvider()` (not the full `providers()`/`ghProviders()`). `ghProviders()` resolves GitHub credentials **eagerly** at layer-build time — with no `GITHUB_TOKEN`/`GITHUB_ACCESS_TOKEN` it fails immediately (`Failed to resolve GitHub credentials for profile 'default'`), even when no comment is posted. `CommentProvider()` instead reads `GITHUB_TOKEN`/`GITHUB_ACCESS_TOKEN` **lazily**, only when a `Comment` is actually reconciled or deleted. So it's always safe to include unconditionally: CI supplies the token via env; local `deploy`/`destroy` without a token never fail at build. The `Comment` resource is the only GitHub resource the stack uses, so `CommentProvider()` alone is enough. The cleanup job destroys the `Comment`, so it passes `GITHUB_TOKEN` + `PULL_REQUEST`.

### Shared database is destroy-protected

The `PostgresDatabase` is **one physical database (`wal-go`) shared by every stage** — only the *branch* is per-PR. Each stage's state holds its own `db` handle pointing at that same physical DB. With the default `destroy` policy, `alchemy destroy` on **any** stage (including a preview PR) would issue a PlanetScale `DELETE database` and wipe prod. **This happened once** — a preview-stage destroy deleted the production database.

Fix: the `db` resource is wrapped with `RemovalPolicy.retain(true)`. `destroy` now only removes it from Alchemy state and never calls PlanetScale delete; the database survives. To genuinely delete it, do so manually in the PlanetScale dashboard. `PostgresBranch` keeps the default `destroy` policy on purpose — preview branches *should* tear down on PR close.

### `PostgresRole` takes a literal db name

`PostgresRole`'s `database` is passed the constant string (`databaseName = "wal-go"`), **not** the `db` resource. This works around an `alchemy@2.0.0-beta.44` bug (present through ≥beta.58) that broke prod deploys whenever the `db` had a pending change.

**Symptom 1 — plan crash:**

```
Error: Not implemented yetpostgresql
    at Plan.js  (resolveOutput fallthrough)
    at plan.diff.resource
```

**Symptom 2** (after naively patching past symptom 1) — reconcile crash on a PlanetScale role API call: `Expected string, got undefined at ["database"]`.

**Cause:** when `PostgresDatabase` has a pending **update** (a new migration changes its `migrationsHashes`), Alchemy resolves a referencing resource's prop via `resolveResource` → `withStables(db.attr)`. `PostgresDatabase`'s `stables` are only `["id","organization","kind","region"]` — **`name` is not stable**. So a resource holding `database: db` (the role) can't get a concrete db `name` while the db is updating: plan-time it surfaces the stable attrs through `Output.proxy` as an Expr with `kind:"postgresql"` (no resolver branch → `Effect.die`); reconcile-time `resolveDatabaseName(news.database).name` is `undefined` → the PlanetScale role API gets `database: undefined`.

**Fix:** the db name is constant, so pass it as a literal string instead of referencing the resource. The role then never resolves the updating `db`, sidestepping both crashes. In prod this removes the only reference to `db`'s output entirely. `PostgresBranch` (preview only) still takes `database: db` — fine, because the db never *updates* in a preview stage (`migrationsDir` is set on the branch there, not the db), so it always resolves to fully-stabilized attrs. Ordering for preview is preserved through the role's `branch` → `PostgresBranch` → `db` edge.

A framework patch was tried first (unwrap the proxy in `resolveOutput`) but it returned the stable-only attrs, dropping `name` — that's symptom 2. Fixing it at the call site is correct; revisit if alchemy makes `name` stable or otherwise fixes references to updating resources.

## Local development

### `vite dev` (Node.js, pure local) — default

```sh
pnpm dev  # from repo root (runs turbo dev:bare)
```

The default local workflow. Runs entirely in Node.js, no Cloudflare/alchemy dependency. Needs local Postgres at `localhost:5432` (`docker compose up -d`).

Plain `vite dev` runs the SSR handler in the same Node process and does **not** read `.env` on its own (Vite only exposes `VITE_`-prefixed vars to `import.meta.env`, never to `process.env`). So `vite.config.ts` loads every var from `apps/web/.env` into `process.env` when `command === "serve"` — without this, server code (`@WAL-GO/auth`, `@WAL-GO/db`) sees empty `process.env` and throws (`Missing required env var: BETTER_AUTH_SECRET`, no `DATABASE_URL`). All Cloudflare-only paths degrade gracefully when their binding is absent: `getDb()` falls back to `process.env.DATABASE_URL`, `sendEmail()` / Discord / R2 image upload log-and-skip.

### `alchemy dev` (workerd, Hyperdrive dev override)

```sh
pnpm dev:alchemy  # from repo root
# or: cd packages/infra && pnpm dev
```

Runs the Worker in workerd. Hyperdrive `dev` override connects to local Postgres at `localhost:5432`. Requires a local Postgres instance.

In Alchemy's dev mode (`AlchemyContext.dev`), the stack skips PlanetScale entirely — no `PostgresDatabase`/`PostgresBranch`/`PostgresRole` are created, so `alchemy dev` never provisions a throwaway PlanetScale branch. `role.origin`/`role.connectionUrl` fall back to the same local Postgres credentials as the Hyperdrive `dev` override (`postgres://postgres:postgres@localhost:5432/wal-go`).

The `EMAIL` binding is also skipped in dev mode — Cloudflare's `send_email` binding isn't supported in local/workerd-dev (`WorkerValidationError: send_email bindings are not supported in local mode`). `sendEmail()` already handles a missing binding by logging and skipping, same as `vite dev`.

## Migrations

Managed by Alchemy via `Drizzle.Schema`. On every deploy Alchemy compares the current schema against the latest snapshot and generates a new migration if anything changed. Files live in `packages/db/migrations/` as `{timestamp}_migration/migration.sql` + `snapshot.json` and must be committed. Both `alchemy deploy` and the `drizzle-kit` CLI scripts use this directory.

Applied automatically on deploy: prod (`main`) via `PostgresDatabase.migrationsDir`; PR preview (`pr-{N}`) via `PostgresBranch.migrationsDir`. The `__drizzle_migrations` table is created per branch and tracks applied filenames so each migration runs once. To add one: edit the schema, then deploy.

## Database connection

`createDb()` (`packages/db/src/index.ts`) accepts an optional `connectionString`. Resolution: explicit arg → `HYPERDRIVE.connectionString` (preferred, pooled) → `cloudflareEnv.DATABASE_URL` (direct fallback) → `process.env.DATABASE_URL` (Node/`vite dev`). The context layer (`packages/api/src/context.ts`) resolves this automatically. See [db.md](db.md) for pooling and request-lifecycle rules.

Note: Hyperdrive-pooled connections still appear in PlanetScale as `application_name = postgres.js` (Hyperdrive passes the client name through) — distinguish pooled from direct by `usename` and connection lifetime, not application name. Every client also injects a per-session `idle_session_timeout = 5min`, so a session left idle (crashed script, or a preview-stage direct fallback) is reaped server-side instead of holding a connection slot.

### Prod has no direct `DATABASE_URL`

Prod Worker binds **only** `HYPERDRIVE` — no direct `DATABASE_URL` env. Previously both were bound, so a momentarily-unconfigured Hyperdrive (binding present but `connectionString` empty — happens in the deploy swap window while a rotated `PostgresRole` branch password propagates to the Hyperdrive origin) made `resolveConnectionString` fall through to the direct `DATABASE_URL`. Those direct sessions don't pool; during a deploy many requests open one at once and they linger idle, eventually exhausting non-superuser slots (`remaining connection slots are reserved for roles with the SUPERUSER attribute`), which also locks out a local direct connection to prod.

With no direct binding, that window now throws loud (`[db] No database connection string configured`) instead of silently leaking unpooled sessions — a brief, visible deploy-window error that points at Hyperdrive propagation rather than a hidden slot leak. Preview stages keep the direct binding (low traffic, eases debugging); the per-session `idle_session_timeout` caps any leak there.

## Production debugging

Workers have no long-running console — use Workers Logs:

```sh
pnpm --dir apps/web exec wrangler tail wal-go-web-prod-qpklntmn3zhnzpcb --format pretty
```

Reproduce the request (e.g. load `https://walgo.lt/`); `console.error` appears in the tail and in Workers Observability. The prod script name changes when Alchemy recreates the Worker — confirm the current name in the Cloudflare dashboard or deploy output before tailing.

For DB checks, query PlanetScale for Hyperdrive sessions:

```sql
SELECT DISTINCT usename, application_name
FROM pg_stat_activity
WHERE application_name = 'Cloudflare Hyperdrive';
```

If direct `DATABASE_URL` works but Hyperdrive doesn't, compare the Hyperdrive origin host/port/database/user/password/SSL mode in Cloudflare against the current PlanetScale role values.

## Deployment

CI deploys via GitHub Actions (`.github/workflows/deploy.yml`).

Required GitHub secrets:

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `PLANETSCALE_API_TOKEN_ID` | PlanetScale service token ID |
| `PLANETSCALE_API_TOKEN` | PlanetScale service token value |
| `PLANETSCALE_ORGANIZATION` | PlanetScale organization slug |
| `BETTER_AUTH_SECRET` | better-auth secret key |
| `GITHUB_TOKEN` | PR preview comment token (auto-provided by Actions) |

The Cloudflare token must be the **raw** token value (store `abc...`, not `Bearer abc...` or the token ID), scoped to `CLOUDFLARE_ACCOUNT_ID`, allowing: Account Settings Read, Workers Scripts Edit, Hyperdrive Edit, Secrets Store Edit (or Read + Write if split).

The deploy workflow follows Alchemy's recommended shape: top-level `STAGE`, `deploy-${{ github.ref }}` concurrency with `cancel-in-progress: false`, `contents: read` + `pull-requests: write`, deploy on non-closed events. `STAGE` = `prod` on `main`, `pr-{N}` for PRs, else the branch name. Deploy/destroy call `pnpm exec alchemy ...` directly from `packages/infra` with `--yes` (non-interactive); root `pnpm deploy`/`destroy` also bypass Turbo so `--yes`/`--stage` reach Alchemy. Cleanup runs only for closed PRs and refuses to destroy `prod`.

PlanetScale auth uses an `Authorization` header in `<SERVICE_TOKEN_ID>:<SERVICE_TOKEN>` format, scoped to `PLANETSCALE_ORGANIZATION`. Required access:

- Organization: `create_databases`.
- Database (all current/future, or at least `wal-go`): `read_database`, `write_database`, `read_branch`, `create_branch`, `delete_branch`, `connect_branch`, `connect_production_branch`, `create_branch_password`, `create_production_branch_password`, `delete_branch_password`, `delete_production_branch_password`.

`write_database` is needed because Alchemy reconciles DB settings via `PATCH /organizations/{org}/databases/{database}`. Password permissions are needed because `PostgresRole` creates/deletes branch credentials for Hyperdrive.

Required GitHub variables (prod only):

| Variable | Description |
|---|---|
| `CORS_ORIGIN` | Allowed CORS origin |
| `BETTER_AUTH_URL` | Public URL for better-auth |

Both are bound on the Worker **only when `isProd`**. Preview stages deploy to an ephemeral per-PR URL (`web.url`) no static variable can know ahead of time, so they leave both unset; better-auth then infers `baseURL` from the request and auto-trusts that origin (fixing "Invalid origin" login failures on previews). CSRF is unaffected — better-auth still validates the browser-set `Origin` header, which an attacker can't forge cross-site. Prod keeps the pinned values. See `packages/auth/src/index.ts`.

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

### Teardown

On PR close, the `cleanup` job runs `alchemy destroy --stage pr-{N}`. It: aborts unless the stage matches `pr-<number>` (Safety Check — never destroys `prod` or a branch stage); retries up to 3× (idempotent); removes only the preview **branch** and **worker** (the shared db is retained).

### Safe vs. dangerous

| Action | Effect |
|---|---|
| `alchemy destroy --stage pr-{N}` | Safe. Deletes preview branch + worker; shared db retained. |
| `alchemy destroy --stage prod` | Removes prod worker/role/hyperdrive (recoverable by re-deploy). Db retained by `RemovalPolicy.retain(true)`, but never do this on purpose. |
| Delete a PlanetScale **branch** | Safe. A branch is an isolated copy; `main` is protected and can't be deleted without demoting first. |
| Delete the **database** in the dashboard | Destroys production data. The only path that can; never automated. |

Before the retain guard, a manual preview destroy deleted the shared production database — PlanetScale databases carry no ownership tags, so Alchemy treated the same physical `wal-go` db as owned in every stage. The guard prevents recurrence; keep it.

### When CI cleanup fails (manual fix)

1. **Inspect state** (read-only):
   ```sh
   cd packages/infra
   alchemy state stages WAL-GO              # list stages
   alchemy state resources WAL-GO pr-123    # resources in a stage
   alchemy state get WAL-GO pr-123 db-branch
   ```
2. **Destroy a stuck preview** (safe — db retained):
   ```sh
   alchemy destroy --yes --stage pr-123
   ```
   Needs `CLOUDFLARE_API_TOKEN` (or `alchemy login`) + PlanetScale vars from `.env`. No `GITHUB_TOKEN` unless the stage still has a PR `Comment` (set `PULL_REQUEST=123` if so).
3. **Partial/errored destroy:** re-run the same `destroy` — it resumes.
4. **State drift** (changed something in the cloud by hand): `alchemy deploy --adopt --stage pr-123` takes over pre-existing resources into state.
5. **Orphaned PlanetScale branches** (branch left behind, stage gone from state): delete the branch in the dashboard/API. Safe — not the database, and `main` is guarded.
6. **Never** delete the `wal-go` database or demote/delete `main` to "clean up". If the database is ever gone, recovery is a PlanetScale support restore, not a redeploy (a redeploy only recreates an empty db).
