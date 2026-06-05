# Database conventions

## ID strategy

### Default primary key

Every new table uses an integer identity PK — keeps joins narrow, indexes small, managed by Postgres:

```ts
id: integer("id").primaryKey().generatedAlwaysAsIdentity()
```

### Public identifier

When a row is referenced from a URL or external API, add a separate `public_id` column — do **not** expose the integer PK:

```ts
import { generateNanoId } from "../lib/ids";

publicId: varchar("public_id", { length: 12 })
  .unique()
  .notNull()
  .$defaultFn(() => generateNanoId())
```

`generateNanoId()` (`@WAL-GO/db/lib/ids`) produces a 12-char URL-safe token from a Crockford-style alphabet (no ambiguous `I`/`l`/`O`/`U`).

### Auth tables exception

`user`, `session`, `account`, `verification` use `text` IDs supplied by better-auth — leave as-is. Tables referencing `user.id` use `text("user_id")`.

## Timestamps

```ts
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at")
  .defaultNow()
  .$onUpdate(() => new Date())
  .notNull(),
```

User-facing event timestamps (`joined_at`, `starts_at`) take `{ precision: 6, withTimezone: true }`.

## Relations

Declare relations in a separate `xRelations = relations(...)` export, mirroring `schema/auth.ts`. Cyclic imports between schema files are fine — Drizzle resolves relations lazily.

## Connection

Uses the `postgres` (postgres.js) package with the `drizzle-orm/postgres-js` adapter (Workers-compatible without Node networking polyfills). `createDb(connectionString?)` resolution order (`resolveConnectionString` in `packages/db/src/index.ts`):

1. explicit `connectionString` argument (scripts/seeds)
2. `HYPERDRIVE.connectionString` — **preferred** in deployed Workers (pooled)
3. `cloudflareEnv.DATABASE_URL` — direct PlanetScale fallback when no Hyperdrive binding
4. `process.env.DATABASE_URL` — Node / local `vite dev`

In PlanetScale's `pg_stat_activity`, Hyperdrive connections still show `application_name = postgres.js` — tell them apart by `usename` and long-lived idle pooling. A genuine direct bypass only happens when `HYPERDRIVE` is missing/empty and code falls to step 3.

### Pooling and request lifecycle

`createDb()` builds a fresh `postgres` client (and pool) every call. **Request-path code must use `getDb()`, never `createDb()` directly.** `createDb()` stays for one-off scripts (seeds). The original "too many clients already" bug was every request calling `createDb()` and never closing — abandoned pools linger `idle_timeout: 20`s and accumulate.

`getDb()` returns `{ db, dispose }` and behaves per runtime:

- **Cloudflare Workers (prod, `alchemy dev`):** a **fresh client per request**, `max: 1` — reusing one socket across requests throws `Cannot perform I/O on behalf of a different request`, so it's never cached. Hyperdrive pools the real connections server-side, so a node-local client per request is cheap. The caller **must** `await dispose()` (calls `client.end()`) at request end, or it leaks within the isolate.
- **Node / `vite dev`:** a **single shared pool** (`max: 10`) cached on `globalThis` per process — this prevents exhaustion. `dispose` is a **noop**; closing the shared pool per request would re-create the leak. Cached on `globalThis` (not a module var) so Vite HMR re-evaluation doesn't spawn duplicate pools.

Runtime is detected via `getCloudflareEnv()` truthiness (the `cloudflare:workers` module only imports inside a Worker), not the connection-string source.

#### Disposing at request boundaries

Every site that creates a request-scoped db **must** dispose it in a `finally`:

- `apps/web/src/routes/api/rpc/$.ts` — `handle()` disposes the oRPC `createContext` result.
- `apps/web/src/utils/orpc.ts` — the SSR `createRouterClient` disposes per call via an `interceptor`.
- `apps/web/src/routes/api/auth/$.ts` and `apps/web/src/middleware/auth.ts` — use `createAuthScope()` and dispose in `finally`.

To keep auth and app queries on **one** client per request, `createAuth(db)` takes the db as a parameter. `createContext` creates one db, shares it with `createAuth`, and surfaces `dispose`. `createAuthScope()` (`@WAL-GO/auth`) bundles `getDb()` + `createAuth()` + `dispose` so auth-only boundaries don't depend on `@WAL-GO/db` directly.

## Migrations

Schema changes always go through generated migrations — never handwrite SQL:

```sh
pnpm db:generate   # produces src/migrations/000X_*.sql
pnpm db:migrate    # applies pending migrations
```

See [infra.md](infra.md) for how Alchemy generates/applies migrations on deploy.
