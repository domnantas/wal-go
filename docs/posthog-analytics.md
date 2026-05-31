# PostHog Analytics

WAL GO uses [PostHog](https://posthog.com) for product analytics, session replay, and error tracking. The integration lives in `apps/web`.

## Configuration

Environment variables in `apps/web/.env`:

| Variable | Description |
|---|---|
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project API key |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog ingestion host (EU: `https://eu.i.posthog.com`) |

## Client-side setup

`PostHogProvider` wraps the entire app shell in `apps/web/src/routes/__root.tsx`. PostHog requests are proxied through the Vite dev server at `/ingest` to avoid CORS issues and ad blockers — see the `server.proxy` config in `apps/web/vite.config.ts`.

## User identification

`PostHogIdentify` (in `apps/web/src/components/providers.tsx`) watches the better-auth session and calls `posthog.identify()` whenever a user is authenticated. On sign-out the distinct ID is reset via `posthog.reset()`.

## Tracked events

| Event | File | Description |
|---|---|---|
| `qso_created` | `apps/web/src/domains/log/add-qso-dialog.tsx` | User manually creates a QSO via the dialog |
| `cabrillo_imported` | `apps/web/src/routes/log.tsx` | User imports a Cabrillo log file; carries `accepted`, `skipped`, `errors` properties |
| `qso_deleted` | `apps/web/src/routes/log.tsx` | User deletes a QSO from their log |
| `season_joined` | `apps/web/src/routes/join-season.tsx` | User completes the wheel spin and joins a season team; carries `team` property |

## Dashboard

The **Analytics basics** dashboard in PostHog contains:

- **QSOs created over time** — daily trend of manual QSO entries
- **Cabrillo imports over time** — import count + total QSOs accepted per import
- **Season joins over time** — weekly unique users joining seasons
- **Active loggers** — unique users submitting any QSO per day (manual or Cabrillo)
- **Season join funnel** — users who joined a season and went on to create a QSO
