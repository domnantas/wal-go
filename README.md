# WAL-GO

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Copy `apps/web/.env.example` to `apps/web/.env` — it's pre-configured to connect to this local instance. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32``.

```bash
cp apps/web/.env.example apps/web/.env
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

### Local development (Docker)

Start Postgres locally:

```bash
docker compose up -d
```

This runs Postgres on `localhost:5432` with:
- User: `postgres`
- Password: `postgres`
- Database: `wal-go`

Stop the database:

```bash
docker compose down
```

### Apply schema

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@WAL-GO/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment (Cloudflare via Alchemy)

- Dev: cd apps/web && pnpm run alchemy dev
- Deploy: cd apps/web && pnpm run deploy
- Destroy: cd apps/web && pnpm run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Git Hooks and Formatting

- Format and lint fix: `pnpm run check`

## Project Structure

```
WAL-GO/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Biome formatting and linting
