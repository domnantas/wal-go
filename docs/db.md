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

`createDb(connectionString?: string)` accepts an optional connection string:
- In deployed Cloudflare Workers: `DATABASE_URL` is preferred for a direct PlanetScale connection; `HYPERDRIVE.connectionString` remains the fallback
- In `alchemy dev`: Hyperdrive's local override is used unless a local `DATABASE_URL` is present
- Without a connection string: falls back to `process.env.DATABASE_URL`

The API context, auth route, and auth middleware resolve this automatically so auth and application queries use the same connection source.

## Migrations

Schema changes always go through generated migrations:

```sh
pnpm db:generate   # produces src/migrations/000X_*.sql
pnpm db:migrate    # applies pending migrations
```

Never handwrite migration SQL.
