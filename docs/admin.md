# Admin

The `/admin` route is a protected management UI accessible only to users with `role = "admin"`.

## Access control

Two layers enforce admin-only access:

- **Route guard** (`beforeLoad` in `apps/web/src/routes/admin.tsx`): redirects to sign-in if unauthenticated, redirects to `/` if role is not `"admin"`.
- **API procedures** (`adminProcedure` in `packages/api/src/index.ts`): every admin endpoint independently verifies `role === "admin"` server-side and throws `FORBIDDEN` otherwise. This protects against direct HTTP calls that bypass the route guard.

## Features

### Dashboard tab (Apžvalga)

Default tab. Shows at-a-glance stats:

- **Global stat cards**: total registered users, total QSOs across all seasons, season count.
- **Per-season cards** (chronological by start date, oldest first): season name, status badge (`active` / `upcoming` / `ended`), date range, QSO count, total member count, and a team bar (yellow / green / red) where the primary metric is controlled WAL square count. Points and member count are shown as secondary metrics.
- **Drift badge** (per season card): a green "Taškai sutampa" badge when the stored scores match the source-of-truth QSOs, or a red "Aptiktas taškų neatitikimas" warning showing how many square rows, user rows, and total points differ. Computed by `computeScoreDrift` (`packages/api/src/scoring/drift.ts`); see `docs/scoring.md` for the detector logic. The red badge carries a **"Perskaičiuoti"** button (procedure `orpc.admin.scores.recompute`) that wipes and rebuilds the season's score tables from the source-of-truth QSOs, fixing the drift; see `docs/scoring.md` § Repair: recompute scores.

Team points and controlled-square counts are derived from `square_score`. A square counts as controlled by a team only when that team has strictly more points than either rival on the square; tied leaders do not control the square.

Implemented via `orpc.admin.dashboard` in `packages/api/src/routers/admin.ts`.

### Users tab

- List all registered users (callsign, email, email confirmation status, role, banned status). Callsigns are colored by the user's active-season team when they have joined the current season.
- Toggle role between `user` and `admin`
- Ban / unban a user (ban requires confirmation dialog). Banning keeps the user's QSO rows but removes their points from the score tables (and unbanning restores them) so banned operators do not count on the map or leaderboard — see `docs/scoring.md` § Banned users.
- Delete a user with confirmation. Deleting an active user first removes their points from materialized score tables, then deletes the account; related sessions, accounts, QSOs, uploads, season memberships, and user season score rows are removed through database cascades. Admins cannot delete their own account.

Implemented via `orpc.admin.users.*` procedures in `packages/api/src/routers/admin.ts`.

### Seasons tab

- List all seasons with name, dates, and derived status (`upcoming` / `active` / `ended`)
- Create a new season (name + start/end datetime)
- Edit an existing season
- Delete a season with confirmation (cascades to all memberships and QSOs)
- Manage season memberships via a per-season "Nariai" dialog (see below)

Implemented via `orpc.admin.seasons.*` procedures in `packages/api/src/routers/admin.ts`.

### Season memberships dialog

Opened from the "Nariai" button on any season row in the Seasons tab.

- List all members of the selected season (callsign, email, team)
- Change a member's team (yellow / green / red) via inline select — updates immediately
- Remove a member with confirmation (membership deleted; user can rejoin)
- Add a new member: pick from users not already in the season, choose team, submit

Only users not yet in the season appear in the add-member dropdown (filtered client-side).

Implemented via `orpc.admin.memberships.*` procedures in `packages/api/src/routers/admin.ts`.

### Uploads tab (Įkėlimai)

Lists all log file imports (Cabrillo and ADIF) across all seasons, newest first.

Columns: timestamp, callsign, format (`cabrillo`/`adif` badge), season name, accepted QSO count (green badge), skipped count (muted badge). The detail dialog shows the raw log content under "Žurnalo turinys".

A row is written to `cabrillo_upload` (which carries a `format` column) inside the same transaction as the QSO inserts, so accepted/skipped counts are always consistent with what actually landed in the DB. Rows cascade-delete if the user or season is deleted.

Implemented via `orpc.admin.uploads.list` in `packages/api/src/routers/admin.ts`. Record inserted in `commitUpload` in `packages/api/src/routers/qsos.ts`.

### QSOs tab

- Select a season from a dropdown to view its QSOs
- List all QSOs for the selected season (timestamp, operator callsign, contact callsign, band, mode, squares)
- Delete a QSO with confirmation — scores are recalculated via `scoreDelete` on deletion

Implemented via `orpc.admin.qsos.*` procedures in `packages/api/src/routers/admin.ts`.

## orpc queryOptions API note

When calling `queryOptions` on a procedure that requires input, wrap the input under the `input` key:

```ts
orpc.admin.qsos.list.queryOptions({ input: { seasonId } })
```

Passing the input object directly (`queryOptions({ seasonId })`) sets `options.input = undefined` and the server receives no input.

## Granting admin role

There is no UI for the initial admin grant. Set `role = 'admin'` directly in the database, or use the Better Auth admin API (`authClient.admin.setRole()`). Once one admin exists, they can promote others through the admin UI.
