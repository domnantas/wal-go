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

1. `PostgresDatabase` — single shared PlanetScale database (`wal-go`, `PS_5` cluster in `eu-central`)
2. `PostgresBranch` — isolated branch per PR stage; prod uses `main` directly
3. `PostgresRole` — credentials with `postgres` inherited role; `.origin` wires directly into Hyperdrive
4. `Hyperdrive` — pools connections; uses the unique logical id `hyperdrive` so it does not collide with the PlanetScale database resource; `dev` override points to `localhost:5432` for `alchemy dev`
5. `Vite` — deploys the web app as a Worker with `HYPERDRIVE` binding and `nodejs_compat_populate_process_env` so Worker variables/secrets are available through `process.env`

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

## Database connection

`createDb()` in `packages/db/src/index.ts` accepts an optional `connectionString`:
- In workerd (deployed or `alchemy dev`): `getHyperdriveConnectionString()` in `@WAL-GO/env/server` reads `env.HYPERDRIVE.connectionString` from the `cloudflare:workers` virtual module and passes it into API and auth database clients
- In Node.js (`vite dev`): no Hyperdrive binding exists, so database clients fall back to `process.env.DATABASE_URL`

The context layer (`packages/api/src/context.ts`) resolves this automatically.

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

The Cloudflare token must be the raw API token value, not the token ID and not an `Authorization` header value. Store `abc...` in `CLOUDFLARE_API_TOKEN`, not `Bearer abc...`. It must be scoped to the account in `CLOUDFLARE_ACCOUNT_ID` and allow:

- Account Settings: Read
- Workers Scripts: Edit
- Hyperdrive: Edit
- Secrets Store: Edit (or Secrets Store Read + Write if Cloudflare shows split permissions)

The deploy workflow verifies the token itself with Cloudflare's token verification endpoint, then checks the account, Workers Scripts, Hyperdrive, and Secrets Store APIs that Alchemy uses. If token verification passes but one of the endpoint checks fails with `401` or `403`, the token is valid but is missing that API permission for the account. A `404` is accepted only for the Workers state-store script settings check because the `alchemy-state-store` Worker may not exist yet on the first deploy. Preview deploys intentionally skip pull requests from forks because repository secrets are not available to those workflow runs.

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
