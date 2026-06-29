# Activity Feed

In-app liveness signals show game activity. The two signals documented here — the takeover
feed and the map pulse — stay anonymized (team, square, and time only, never callsigns or
user ids) so they are safe for the public, logged-out homepage. The separate callsign→team
roster is now visible to signed-in users elsewhere (player visibility experiment, see
[overview.md](overview.md)): live individual standings ([leaderboard.md](leaderboard.md)) and
the square-detail contact list (`scoring.recentSquareContacts`, [map.md](map.md)), which is the
authed counterpart that shows callsigns.

## Activity feed

A stream of recent square **takeovers** (ownership changes). Takeovers are the same events
posted to Discord ([discord-announcements.md](discord-announcements.md)); the feed surfaces
them in-app. Only takeovers are shown — individual QSOs are intentionally excluded so a bulk
Cabrillo import (100 old QSOs logged at once) can't flood the feed or imply contacts are
recent.

### Persistence

Takeovers are persisted to `square_control_history` ([db.md](db.md), [scoring.md](scoring.md)). Inserts happen in `applyScoreDeltas` (`packages/api/src/scoring/apply-deltas.ts`) in the same transaction as the score change, covering QSO create/update/delete/import and ban/unban. `recomputeSeasonScores` bypasses it by design, matching Discord announcements.

### Endpoint

`scoring.activityFeed` (`packages/api/src/routers/scoring.ts`, `publicProcedure`):

- Input `{ seasonId?, limit? }` — `limit` defaults to 30, max 50. Season resolves to the
  active season when omitted (`resolveSeasonId`).
- Returns `{ id, squareCode, before, after, at }[]` ordered by `at` desc, where `before` /
  `after` are team colors or `null` (uncontrolled). No user-identity columns exist on the
  table, so nothing to strip.

### UI

`ActivityFeedBox` (`apps/web/src/domains/scoring/activity-feed-box.tsx`):

- Polls via TanStack Query `refetchInterval: 20000` (the app's first polling query).
- Each row: a team-colored dot, Lithuanian text, and relative time via `date-fns`.
- Line text is built client-side from `before`/`after` null-ness, mirroring the Discord phrasing:
  - first claim: `Kvadratą {code} užėmė {team}`
  - overtake: `Kvadratą {code} perėmė {team} (buvo {prev})`
  - lost to tie: `Kvadratas {code} tapo nevaldomas (buvo {prev})`
- Empty state: `Kol kas tylu`.
- `variant`: `sidebar` (bordered section, limit 20, single-column list capped at `max-h-80` with its own scroll) and `compact` (homepage, limit 6, entries laid out in a responsive multi-column grid so they fill the wide card instead of stretching one row each).

Shared team labels/colors live in `apps/web/src/domains/scoring/teams.ts` (extracted from
`team-controlled-squares-box.tsx`).

Placement: the `/map` right sidebar after the team-controlled box
(`apps/web/src/routes/map.tsx`), and a compact card in the homepage live section
(`apps/web/src/routes/index.tsx`) — public, doubling as social proof for logged-out visitors.

## Map pulse

WAL squares with a radio contact in the last 2 hours pulse on the map. See [map.md](map.md).

### Endpoint

`scoring.recentSquares` (`publicProcedure`): input `{ seasonId? }`, returns `string[]` of
square codes with `qso.qsoAt >= now() - 2 hours` for the season, excluding banned users
(`user.banned = false`, matching scoring). Keys on **`qsoAt`** (real on-air contact time), not
`createdAt`, so a bulk upload of an old log correctly does **not** pulse.

## Privacy invariant

The public liveness endpoints — `scoring.activityFeed`, `scoring.recentSquares`, and
`scoring.recentContactLines` — never return `userId`, `user.name`, or a callsign. The feed
exposes team + square + time; the pulse exposes square only; the contact lines expose
operator/contact squares + team. This keeps the **public homepage and logged-out map** clean.
Callsign-revealing endpoints (`individualStandings`, `recentSquareContacts`) are all
`protectedProcedure`s gated to signed-in users.
