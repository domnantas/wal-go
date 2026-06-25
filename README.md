# WAL-GO

Lithuanian amateur radio territory competition web app. Operators join seasonal teams, log QSOs, and compete for WAL grid squares.

## Stack

- TanStack Start + TanStack Router
- oRPC API layer
- Drizzle + PostgreSQL
- Better Auth
- Tailwind CSS + shadcn/ui in `packages/ui`
- Cloudflare Workers + Alchemy + PlanetScale for deployment
- Ultracite/Biome for formatting and linting

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
openssl rand -base64 32 # use this for BETTER_AUTH_SECRET
```

The example env is preconfigured for local Postgres.

```bash
docker compose up -d
pnpm db:push
pnpm dev
```

Local DB defaults: `postgres:postgres@localhost:5432/wal-go`.

## UI Customization

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add shared shadcn components

Run from the project root:

```bash
pnpm dlx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@WAL-GO/ui/components/button";
```

## Deployment (Cloudflare via Alchemy)

- Dev with workerd: `pnpm dev:alchemy`
- Deploy: `pnpm deploy`
- Destroy: `pnpm destroy`

See [docs/infra.md](docs/infra.md).

## Formatting

- Check: `pnpm check`
- Fix: `pnpm fix`

## Project Structure

```
wal-go/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm dev`: Start the local Node/Vite workflow
- `pnpm dev:alchemy`: Start the workerd/Alchemy workflow
- `pnpm build`: Build all apps/packages
- `pnpm check-types`: Typecheck all apps/packages
- `pnpm test`: Run package tests
- `pnpm db:push`: Push schema changes locally
- `pnpm db:generate`: Generate migrations
- `pnpm db:migrate`: Run migrations
- `pnpm db:studio`: Open Drizzle Studio
- `pnpm check`: Run Ultracite/Biome checks
- `pnpm fix`: Apply Ultracite/Biome fixes
