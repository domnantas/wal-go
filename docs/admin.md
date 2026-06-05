# Admin

`/admin` is a protected management UI for users with `role = "admin"`.

## Access control

Two layers:

- **Route guard** (`beforeLoad` in `apps/web/src/routes/admin.tsx`): redirects to sign-in if unauthenticated, to `/` if role isn't `"admin"`.
- **API procedures** (`adminProcedure` in `packages/api/src/index.ts`): every admin endpoint independently verifies `role === "admin"` server-side and throws `FORBIDDEN`, protecting against direct HTTP calls that bypass the guard.

All procedures live in `packages/api/src/routers/admin.ts`.

## Tabs

### Dashboard (Apžvalga) — default

- **Global stat cards**: total users, total QSOs across all seasons, season count.
- **Per-season cards** (oldest first): name, status badge (`active`/`upcoming`/`ended`), date range, QSO count, total members, and a team bar (yellow/green/red) whose primary metric is controlled WAL square count, with points and member count secondary.
- **Drift badge** per card: green "Taškai sutampa" when stored scores match the source-of-truth QSOs, or red "Aptiktas taškų neatitikimas" showing how many square rows, user rows, and total points differ. Computed by `computeScoreDrift` (`packages/api/src/scoring/drift.ts` — see [scoring.md](scoring.md)). The red badge carries a **"Perskaičiuoti"** button (`admin.scores.recompute`) that wipes and rebuilds the season's score tables from QSOs.

Team points and controlled-square counts derive from `square_score`; a square counts as controlled only when one team has strictly more points than either rival. Implemented via `admin.dashboard`.

### Users

- List all users (callsign, email, email confirmation, role, banned). Callsigns are colored by active-season team when the user has joined the current season.
- Toggle role between `user` and `admin`.
- Ban / unban (ban requires confirmation). Banning keeps QSO rows but removes the user's points from the score tables (unban restores them) — see [scoring.md](scoring.md) § Banned users.
- Delete with confirmation: first removes the user's points from score tables, then deletes the account (sessions, accounts, QSOs, uploads, memberships, user-season-score rows cascade). Admins can't delete their own account.

Via `admin.users.*`.

### Seasons

- List all seasons (name, dates, derived status).
- Create (name + start/end datetime), edit, delete (confirmation; cascades to memberships and QSOs).
- Manage memberships via the per-season "Nariai" dialog.

Via `admin.seasons.*`.

### Season memberships dialog

Opened from "Nariai" on a season row:

- List members (callsign, email, team).
- Change a member's team via inline select (immediate).
- Remove a member (confirmation; user can rejoin).
- Add a member: pick from users not already in the season (filtered client-side), choose team, submit.

Via `admin.memberships.*`.

### Uploads (Įkėlimai)

Lists all log imports (Cabrillo and ADIF) across seasons, newest first. Columns: timestamp, callsign, format badge (`cabrillo`/`adif`), season name, accepted count (green), skipped count (muted). The detail dialog shows raw log content under "Žurnalo turinys".

A row is written to `cabrillo_upload` (which carries a `format` column) inside the same transaction as the QSO inserts, so counts always match what landed in the DB. Rows cascade-delete with the user or season. Via `admin.uploads.list`; record inserted in `commitUpload` (`packages/api/src/routers/qsos.ts`).

### QSOs

- Pick a season from a dropdown to view its QSOs (timestamp, operator callsign, contact callsign, band, mode, squares).
- Delete a QSO with confirmation — scores recalculated via `scoreDelete`.

Via `admin.qsos.*`.

## orpc queryOptions API note

When calling `queryOptions` on a procedure that requires input, wrap it under `input`:

```ts
orpc.admin.qsos.list.queryOptions({ input: { seasonId } })
```

Passing the input directly (`queryOptions({ seasonId })`) sets `options.input = undefined` and the server receives no input.

## Granting admin role

No UI for the initial grant. Set `role = 'admin'` in the database, or use `authClient.admin.setRole()`. Once one admin exists, they can promote others through the UI.
