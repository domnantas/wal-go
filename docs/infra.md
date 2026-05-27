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
