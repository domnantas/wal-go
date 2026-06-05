# Activity Feed and Map Pulse

Two in-app liveness signals that show the game is active **without leaking the
callsign → team mapping** (figuring out who's on which team is part of the game). Both
expose team + square + time only — never a callsign or user id.

## Activity feed

A stream of recent square **takeovers** (ownership changes). Takeovers are the same events
posted to Discord ([discord-announcements.md](discord-announcements.md)); the feed surfaces
them in-app. Only takeovers are shown — individual QSOs are intentionally excluded so a bulk
Cabrillo import (100 old QSOs logged at once) can't flood the feed or imply contacts are
recent.

### Persistence

Takeovers were previously ephemeral (computed, sent to Discord, discarded). They are now
persisted to `square_control_history` ([db.md](db.md), [scoring.md](scoring.md)). The insert
lives in `applyScoreDeltas` (`packages/api/src/scoring/apply-deltas.ts`) — the single
chokepoint every score change passes through — so it runs **in the same transaction** as the
score change (rolled-back changes record nothing) and automatically covers QSO
create/update/delete/import and ban/unban. `recomputeSeasonScores` bypasses
`applyScoreDeltas` and is intentionally not instrumented (matches the Discord behavior).

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
- Each row: a team-colored dot (`TEAM_DOT_CLASSES`, muted when a square became uncontrolled)
  + a Lithuanian line + relative time via `formatDistanceToNowStrict(at, { addSuffix, locale: lt })`.
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

WAL squares with a radio contact in the last 2 hours pulse on the map. See the pulse layer
details in [map.md](map.md).

### Endpoint

`scoring.recentSquares` (`publicProcedure`): input `{ seasonId? }`, returns `string[]` of
square codes with `qso.qsoAt >= now() - 2 hours` for the season, excluding banned users
(`user.banned = false`, matching scoring). Keys on **`qsoAt`** (real on-air contact time), not
`createdAt`, so a bulk upload of an old log correctly does **not** pulse.

## Privacy invariant

No endpoint here returns `userId`, `user.name`, or a callsign. The feed exposes team + square
+ time; the pulse exposes square only. Preserves the hidden-roster gameplay.
