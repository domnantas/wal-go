# PostHog Analytics

WAL GO uses [PostHog](https://posthog.com) for product analytics, session replay, and error tracking. The integration lives in `apps/web`.

## Configuration

Environment variables in `apps/web/.env`:

| Variable | Description |
|---|---|
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project API key |
| `VITE_PUBLIC_POSTHOG_HOST` | Ingestion host (EU: `https://eu.i.posthog.com`) |

## Setup

`PostHogProvider` wraps the app shell in `apps/web/src/routes/__root.tsx`. Requests are proxied through the Vite dev server at `/ingest` to avoid CORS and ad blockers (see `server.proxy` in `apps/web/vite.config.ts`).

`PostHogIdentify` (`apps/web/src/components/providers.tsx`) watches the better-auth session and calls `posthog.identify()` when a user is authenticated; on sign-out it resets the distinct ID via `posthog.reset()`.

## Error tracking

`capture_exceptions: true` (in `PHProvider`) auto-captures uncaught `window.onerror` exceptions and unhandled promise rejections. That alone misses errors that are swallowed before they reach the window handler, so we capture those explicitly:

- **Router error boundary** — `ErrorPage` (`apps/web/src/components/error-page.tsx`) calls `posthog.captureException(error)` on mount. Render and route-loader errors are caught by TanStack Router's `defaultErrorComponent` and never bubble to `window.onerror`.
- **TanStack Query** — the `QueryCache` and `MutationCache` `onError` handlers in `apps/web/src/utils/orpc.ts` call `posthog.captureException(error)`. This covers all oRPC query/mutation failures, including the ones whose per-call `onError` only shows a toast. Guarded by `typeof window` since `makeQueryClient` also runs during SSR.

Not yet captured: **server-side** errors. oRPC's server `onError` interceptors (`apps/web/src/routes/api/rpc/$.ts`) only `console.error`. `posthog-js` is client-only — capturing server/SSR errors would require `posthog-node` with a per-request flush on the worker.

## Tracked events

| Event | File | Description |
|---|---|---|
| `qso_created` | `domains/log/add-qso-dialog.tsx` | Manual QSO created via the dialog |
| `qso_updated` | `domains/log/add-qso-dialog.tsx` | Existing QSO edited |
| `cabrillo_imported` | `routes/log.tsx` | Cabrillo log imported; carries `accepted`, `skipped`, `errors` |
| `qso_deleted` | `routes/log.tsx` | QSO deleted from the log |
| `season_joined` | `routes/join-season.tsx` | Wheel spin completed; carries `team` |

## Dashboard

The **Analytics basics** dashboard contains:

- **QSOs created over time** — daily trend of manual entries.
- **Cabrillo imports over time** — import count + total QSOs accepted per import.
- **Season joins over time** — weekly unique users joining seasons.
- **Active loggers** — unique users submitting any QSO per day.
- **Season join funnel** — users who joined a season and went on to create a QSO.
