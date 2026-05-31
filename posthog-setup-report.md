<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into WAL GO. Here is a summary of all changes made:

- **`apps/web/src/routes/__root.tsx`** — added `PostHogProvider` wrapping the entire app shell, initialising posthog-js with the EU host and a `/ingest` reverse proxy path. Exception capture (`capture_exceptions: true`) is enabled.
- **`apps/web/vite.config.ts`** — added dev-server proxy entries for `/ingest`, `/ingest/static`, and `/ingest/array` pointing to the EU PostHog ingestion and assets hosts.
- **`apps/web/src/components/providers.tsx`** — added `PostHogIdentify` component that calls `posthog.identify()` with the user's ID, email, and callsign on every authenticated session, and `posthog.reset()` on sign-out.
- **`apps/web/src/domains/log/add-qso-dialog.tsx`** — captures `qso_created` with `band`, `mode`, and `has_contact_square` properties on mutation success.
- **`apps/web/src/routes/log.tsx`** — captures `cabrillo_imported` (with `accepted`, `skipped`, `errors` counts) and `qso_deleted` on their respective mutation successes.
- **`apps/web/src/routes/join-season.tsx`** — captures `season_joined` with the assigned `team` when the wheel animation completes.
- **`apps/web/.env`** — `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` added.
- **`docs/posthog-analytics.md`** — new documentation file covering setup, identification, and tracked events.

## Events

| Event | Description | File |
|---|---|---|
| `qso_created` | User manually creates a QSO via the add QSO dialog | `apps/web/src/domains/log/add-qso-dialog.tsx` |
| `cabrillo_imported` | User imports a Cabrillo log file; carries accepted, skipped, error counts | `apps/web/src/routes/log.tsx` |
| `qso_deleted` | User deletes a QSO from their log | `apps/web/src/routes/log.tsx` |
| `season_joined` | User completes the wheel spin and joins a season team; carries team name | `apps/web/src/routes/join-season.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/715195)
- [QSOs created over time](/insights/TgihGc5b)
- [Cabrillo imports over time](/insights/qNq6HsVm)
- [Season joins over time](/insights/2NSevcqT)
- [Active loggers (unique users submitting QSOs)](/insights/nVtDbF5L)
- [Season join funnel](/insights/Rf2g119m)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
