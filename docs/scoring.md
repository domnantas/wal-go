# Scoring and Territory Control

## Points

For the alpha season, each accepted QSO awards one point to the submitting user's team on the operator's WAL square:

- **Operator's square** (`MY_GRIDSQUARE`) — always awarded.
- **Contact's square** (`GRIDSQUARE`) — stored when provided, but does not affect scoring in the alpha season.

Points are per-season. A user who deletes a QSO loses those points immediately.

## Duplicate Rules

Duplicate handling has two layers:

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

### Recompute on QSO delete

Deleting a QSO decrements points symmetrically. The transaction:

1. Find the operator square from the QSO record.
2. Decrement `square_score.points` for the user's team on that square.
3. Decrement `user_season_score.points` for the user.

The UI map next polls and reflects the change.
