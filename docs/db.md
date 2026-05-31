# Database conventions

## ID strategy

### Default primary key

Every new table uses an integer identity primary key:

```ts
id: integer("id").primaryKey().generatedAlwaysAsIdentity()
```

Integer PKs keep joins narrow, indexes small, and are managed by Postgres.

### Public identifier

When a row needs to be referenced from a URL or external API, add a separate `public_id` column. Do **not** expose the integer PK.

```ts
import { generateNanoId } from "../lib/ids";

publicId: varchar("public_id", { length: 12 })
  .unique()
  .notNull()
  .$defaultFn(() => generateNanoId())
```

`generateNanoId()` lives in `@WAL-GO/db/lib/ids` and produces a 12-character URL-safe token from a Crockford-style alphabet (no ambiguous `I`/`l`/`O`/`U`).

### Auth tables exception

`user`, `session`, `account`, `verification` use `text` IDs supplied by better-auth. Leave them as-is. Tables that reference `user.id` use `text("user_id")`.

## Timestamps

```ts
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at")
  .defaultNow()
  .$onUpdate(() => new Date())
  .notNull(),
```

User-facing event timestamps (e.g. `joined_at`, `starts_at`) take `{ precision: 6, withTimezone: true }`.

## Relations

Declare relations in a separate `xRelations = relations(...)` export, mirroring `schema/auth.ts`. Cyclic imports between schema files are fine — Drizzle resolves relations lazily.

## Connection

Uses the `postgres` (postgres.js) package with the `drizzle-orm/postgres-js` adapter. Compatible with Cloudflare Workers without Node.js polyfills for networking.

`createDb(connectionString?: string)` accepts an optional connection string:
- In deployed Cloudflare Workers: `DATABASE_URL` (CF secret) is preferred for a direct PlanetScale connection; `HYPERDRIVE.connectionString` remains the fallback
- Without a connection string: falls back to `process.env.DATABASE_URL`

### Pooling and request lifecycle

`createDb()` builds a fresh `postgres` client (and pool) on every call. **Request-path code must use `getDb()`, never `createDb()` directly.** `createDb()` stays for one-off scripts (e.g. seeds). The original "too many clients already" bug was every request calling `createDb()` and never closing — abandoned pools linger `idle_timeout: 20`s and accumulate.

`getDb()` returns `{ db, dispose }` and behaves differently per runtime:

- **Cloudflare Workers (prod, and `alchemy dev`):** a **fresh client per request**, capped at `max: 1`. Reusing one socket across requests on Workers throws `Cannot perform I/O on behalf of a different request`, so the client is never cached. Hyperdrive (the `HYPERDRIVE` binding) pools the real DB connections server-side, so opening a node-local client per request is cheap. The caller **must** `await dispose()` (which calls `client.end()`) when the request ends, or the per-request client leaks within the isolate.
- **Node / local `vite dev`:** a **single shared pool** (`max: 10`) cached on `globalThis` per process — this is the connection pooling that prevents exhaustion. `dispose` is a **noop** here; closing the shared pool per request would re-create the original leak. Cached on `globalThis` (not a module variable) so Vite HMR module re-evaluation does not spawn duplicate pools.

The runtime is detected via `getCloudflareEnv()` truthiness (the `cloudflare:workers` module only imports inside a Worker), not the connection-string source — `DATABASE_URL` is set in both runtimes.

#### Disposing at request boundaries

Every site that creates a request-scoped db **must** dispose it in a `finally`. Current boundaries:

- `apps/web/src/routes/api/rpc/$.ts` — `handle()` disposes the oRPC `createContext` result.
- `apps/web/src/utils/orpc.ts` — the SSR `createRouterClient` disposes per call via an `interceptor` (each SSR procedure call builds its own context).
- `apps/web/src/routes/api/auth/$.ts` and `apps/web/src/middleware/auth.ts` — use `createAuthScope()` and dispose in `finally`.

To keep auth and application queries on **one** client per request, `createAuth(db)` takes the db as a parameter (it no longer opens its own). `createContext` creates one db, shares it with `createAuth`, and surfaces `dispose`. `createAuthScope()` (in `@WAL-GO/auth`) bundles `getDb()` + `createAuth()` + `dispose` so request boundaries that only need auth don't depend on `@WAL-GO/db` directly.

## Migrations

Schema changes always go through generated migrations:

```sh
pnpm db:generate   # produces src/migrations/000X_*.sql
pnpm db:migrate    # applies pending migrations
```

Never handwrite migration SQL.
