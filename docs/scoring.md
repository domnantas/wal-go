# Scoring and Territory Control

## Points

For the alpha season, each accepted QSO awards one point to the submitting user's team on the operator's WAL square:

- **Operator's square** (`MY_GRIDSQUARE`) — always awarded.
- **Contact's square** (`GRIDSQUARE`) — stored when provided, but does not score in the alpha season.

Points are per-season. Deleting a QSO loses its points immediately.

## Duplicate Rules

Two layers; in both the contact callsign is the **base call** (suffixes/prefixes stripped at insert — see Callsign Normalization in [qso-logging.md](qso-logging.md)), so `LY2EN` and `LY2EN/P` from the same square collapse to one identity.

- **Exact duplicates** prevent accidental double submission: same user already has the same season, callsign, band, mode, timestamp, operator square, and contact square.
- **Game duplicates** are scoring rules: in the alpha season, only one QSO with the same callsign, band, mode, operator square, and contact square scores per Lithuanian calendar day (`Europe/Vilnius`). Changing either square lets another such QSO score that day.

## Square Control

A team **controls** a square when it has **strictly more points** than either rival. Ties for the top score → **no owner** (neutral on the map).

| Situation | Owner |
|---|---|
| One team leads | That team |
| Two+ tied for first | No owner |
| No points logged | No owner |

The rule lives once in `computeLeader` (`packages/api/src/scoring/control.ts`), shared by the team standings query and the Discord takeover detector.

### Map coloring

| State | Color |
|---|---|
| Yellow / Green / Red team | Team color |
| Neutral / tie | Gray (no tint) |

## Standings

Scoped to the active season. The scoring router exposes two endpoints (`packages/api/src/routers/scoring.ts`):

- **Team standings** (`scoring.teamStandings`) — teams ranked by WAL squares currently controlled (desc); ties broken by total points. Rendered: the map sidebar shows controlled-square stats under the progress box, in fixed order yellow/green/red, each a progress bar; also used on the homepage and in `SeasonResultsBox`. When no season is active, the sidebar can show recently ended results using the same endpoint scoped to the ended season id.
- **Individual standings** (`scoring.individualStandings`) — operators ranked by total season points (desc): callsign, team color, point total. **API only — no UI yet.** No leaderboard route renders it. Keeping the per-player team mapping hidden is part of the game, so an individual leaderboard is intentionally unbuilt for now.

## Implementation

### Materialized score tables

Scores are stored, not computed on read (full-season aggregation across tens of thousands of QSOs is too expensive for map/leaderboard reads). Schema in `packages/db/src/schema/scoring.ts`:

| Table | Key columns | Notes |
|---|---|---|
| `square_score` | `season_id`, `square_code`, `team`, `points` | Unique on `(season_id, square_code, team)`. One row per active team per square. `points >= 0` check. |
| `user_season_score` | `season_id`, `user_id`, `points` | Individual leaderboard. Unique on `(season_id, user_id)`. `points >= 0` check. |

Both update **in the same transaction** as the QSO insert/delete. Increments use `INSERT ... ON CONFLICT DO UPDATE` on the unique key. A square's owner is **derived on read** (the `team` with `MAX(points)`, checked for strict majority), never stored.

### Map data delivery

`scoring.squares` (`packages/api/src/routers/scoring.ts`) returns all squares for the displayed season with full per-team scores:

```json
[
  { "code": "A05", "scores": { "yellow": 12, "green": 7, "red": 7 } },
  { "code": "A06", "scores": { "yellow": 3, "green": 3, "red": 0 } }
]
```

No `owner` field — the client derives the owner from `scores`. The payload is bounded (~hundreds of squares × 3 ints).

### Banned users

A banned user's QSO rows **stay in the DB**, but their points must **not** count on the map/leaderboard. Ban/unban (`admin.users.ban`/`unban`) run in a transaction that:

1. Locks the user row (`FOR UPDATE`), reads current `banned`.
2. Updates the `banned` flag.
3. On ban, deletes the user's `session` rows. We ban via a raw DB update, not better-auth's `banUser`, because the admin plugin only blocks banned users at **session creation** (re-login) — it doesn't invalidate existing sessions. Without revocation a banned user could keep calling `qsos.create` and re-add removed points.
4. Only if the state changed, calls `applyUserBanScoreChange` (`packages/api/src/scoring/apply-deltas.ts`), which aggregates the user's stored QSOs per `(season, square, team)` and feeds them through `applyScoreDeltas` as negative (ban) or positive (unban) deltas.

The change-guard prevents double-counting on a repeated ban.

### Drift detector

The score tables are a denormalized cache; `qso` is the source of truth. They can drift if a mutation bypasses the delta path (forgotten ban recompute, delta-math bug, direct DB edit).

`computeScoreDrift` (`packages/api/src/scoring/drift.ts`) recomputes expected aggregates from `qso` joined with `user` (excluding banned users) and compares against stored rows. Per season it reports mismatched square rows, mismatched user rows, and net stored-minus-expected point difference. Surfaced per season in the admin dashboard ([admin.md](admin.md)).

> **Baseline assumption:** expected points = count of stored QSO rows, because the alpha rule set awards exactly one point per accepted QSO (game duplicates filtered at insert). A future non-trivial rule set must update this baseline, or the detector reports false drift.

### Repair: recompute scores

When the badge is red, an admin clicks **"Perskaičiuoti"** (`admin.scores.recompute`), running `recomputeSeasonScores` (`packages/api/src/scoring/apply-deltas.ts`) in a transaction: it **wipes** the season's score rows and **rebuilds** them from `qso` joined with `user` (excluding banned users) — the exact aggregation the detector expects. Idempotent; afterward the season is drift-free. Shares the one-point-per-QSO baseline, so a future rule set must update both together.

### Recompute on QSO delete

Deleting a QSO decrements symmetrically: find the operator square, decrement `square_score.points` for the team on that square, decrement `user_season_score.points` for the user.

## Discord announcements

Square control changes (takeovers) post to Discord. Detection lives in `applyScoreDeltas`, the single chokepoint all score changes pass through. See [discord-announcements.md](discord-announcements.md).
