# Scoring and Territory Control

## Points

For the alpha season, each accepted QSO awards one point to the submitting user's team on the operator's WAL square:

- **Operator's square** (`MY_GRIDSQUARE`) — always awarded.
- **Contact's square** (`GRIDSQUARE`) — stored when provided, but does not affect scoring in the alpha season.

Points are per-season. A user who deletes a QSO loses those points immediately.

## Duplicate Rules

Duplicate handling has two layers. In both, the contact callsign is the
**base call** — suffixes/prefixes are stripped at insert (see Callsign
Normalization in `qso-logging.md`), so `LY2EN` and `LY2EN/P` from the same
square collapse to one identity.

- **Exact QSO duplicates** prevent accidental double submission. A QSO is considered exact duplicate when the same user already has the same season, callsign, band, mode, timestamp, operator square, and contact square.
- **Game duplicates** are season scoring rules. In the alpha season, only one QSO with the same callsign, band, mode, operator square, and contact square can score per Lithuanian calendar day (`Europe/Vilnius`). If either operator changes square or the contact's square changes, another QSO with the same callsign, band, and mode can score that day.

## Square Control

A team **controls** a WAL square when it has **strictly more points** than either other team on that square. If two or more teams are tied for the top score, the square has **no owner** and is displayed as neutral on the map.

| Situation                        | Square owner |
|----------------------------------|--------------|
| One team leads                   | That team    |
| Two or more teams tied for first | No owner     |
| No points logged                 | No owner     |

## Map Coloring

| State         | Color            |
|---------------|------------------|
| Yellow team   | Yellow           |
| Green team    | Green            |
| Red team      | Red              |
| Neutral / tie | Gray (no tint)   |

Square colors update as QSOs are submitted or deleted.

## Leaderboard

The leaderboard is scoped to the active season and shows two standings:

### Team standings

Teams ranked by number of WAL squares currently controlled (descending). Ties in square count are broken by total team points.

The map sidebar also shows current controlled-square stats under the season progress box. Sidebar stats keep a fixed visual order — yellow, green, red — and render each team's controlled-square count as a progress bar.

When no season is active, the season sidebar can show recently ended season results. Results use the same team standings endpoint scoped to the ended season id and rank teams by controlled squares, then total points.

### Individual standings

Operators ranked by their total points accumulated in the season (descending). Each row shows callsign, team color, and point total.

## Implementation

### Materialized score table

Scores are stored in a materialized table, not computed on read. With tens of thousands of QSOs per user, on-the-fly aggregation across a full season is too expensive for map and leaderboard reads.

Schema sketch (`packages/db/src/schema/scoring.ts`, TBD):

| Table              | Columns (key)                                                   | Notes                                                       |
|--------------------|-----------------------------------------------------------------|-------------------------------------------------------------|
| `square_score`     | `season_id`, `square_code`, `team`, `points`                    | Unique on `(season_id, square_code, team)`. One row per active team on a square. |
| `user_season_score`| `season_id`, `user_id`, `points`                                | For individual leaderboard. Unique on `(season_id, user_id)`. |

Both tables are updated **in the same transaction** as the QSO insert/delete that triggers the change. Increments use `INSERT ... ON CONFLICT DO UPDATE` (upsert) on the unique key.

A square's owner is derived on read by selecting the `team` with `MAX(points)` for that `(season_id, square_code)` and checking strict majority (no tie). The owner is **not** stored — it's a derived view to avoid extra writes when scores shift.

### Map data delivery

The map fetches a single endpoint returning all squares with full per-team scores (not just the owner). Payload sketch:

```json
[
  { "code": "A05", "scores": { "yellow": 12, "green": 7, "red": 7 }, "owner": "yellow" },
  { "code": "A06", "scores": { "yellow": 3, "green": 3, "red": 0 }, "owner": null }
]
```

The client polls this endpoint at a fixed interval (e.g., 30s) while the map is open, so live activity by other operators is reflected without a manual refresh. Polling chosen over WebSocket/SSE: payload is bounded (~hundreds of squares × 3 ints), no socket infra required.

### Banned users

A banned user's QSO rows **stay in the database**, but their points must **not**
count toward the live map or leaderboard. Ban/unban is therefore not just a flag
flip — `admin.users.ban` / `unban` run in a transaction that:

1. Locks the user row (`FOR UPDATE`) and reads the current `banned` state.
2. Updates the `banned` flag.
3. On ban, deletes the user's `session` rows. We ban with a raw DB update rather
   than better-auth's `banUser` endpoint, and the admin plugin only blocks banned
   users at **session creation** (re-login) — it does not invalidate an existing
   session. Without this revocation a banned user could keep calling
   `qsos.create` and re-add the points we just removed.
4. Only if the state actually changed, calls `applyUserBanScoreChange`
   (`packages/api/src/scoring/apply-deltas.ts`), which aggregates the user's
   stored QSOs per `(season, square, team)` and feeds them through
   `applyScoreDeltas` as negative deltas (ban) or positive deltas (unban).

The change-guard prevents double-counting if a ban is issued twice.

### Drift detector

The score tables are a denormalized cache; the `qso` table is the source of
truth. They can drift if a mutation that should affect scores bypasses the delta
path (a forgotten ban recompute, a bug in the delta math, a direct DB edit).

`computeScoreDrift` (`packages/api/src/scoring/drift.ts`) detects this. It
recomputes the **expected** aggregates from `qso` joined with `user`, excluding
banned users, and compares them against the stored `square_score` /
`user_season_score` rows. Per season it reports the number of mismatched square
and user rows and the net stored-minus-expected point difference.

> **Baseline assumption:** the detector treats "expected points = count of stored
> QSO rows" because the alpha rule set awards exactly one point per accepted QSO
> (game duplicates are filtered at insert time). A future season with a
> non-trivial rule set must update this baseline alongside the rule set, or the
> detector will report false drift.

The result is surfaced per season in the admin dashboard (see `docs/admin.md`).
Because ban/unban already recompute scores, a healthy system stays drift-free; a
red badge means a real inconsistency that needs investigation.

#### Repair: recompute scores

When the badge is red, an admin can fix it from the dashboard with the
**"Perskaičiuoti"** button (procedure `admin.scores.recompute`). It runs
`recomputeSeasonScores` (`packages/api/src/scoring/apply-deltas.ts`) in a
transaction, which **wipes** the season's `square_score` / `user_season_score`
rows and **rebuilds** them directly from `qso` joined with `user`, excluding
banned users — the exact aggregation the detector treats as expected. After it
runs the season is guaranteed drift-free.

This is the general repair for any drift cause: a forgotten ban recompute, a
delta-math bug, a direct DB edit, or a user banned before ban-time enforcement
shipped. It is idempotent — recomputing a healthy season changes nothing. It
shares the same one-point-per-QSO baseline assumption as the detector, so a
future non-trivial rule set must update both together.

### Recompute on QSO delete

Deleting a QSO decrements points symmetrically. The transaction:

1. Find the operator square from the QSO record.
2. Decrement `square_score.points` for the user's team on that square.
3. Decrement `user_season_score.points` for the user.

The UI map next polls and reflects the change.

## Discord announcements

Square control changes (takeovers) are posted to Discord. Detection is built
into `applyScoreDeltas`, the single chokepoint all score changes pass through.
See [discord-announcements.md](./discord-announcements.md).
