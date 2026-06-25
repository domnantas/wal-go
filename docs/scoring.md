# Scoring and Territory Control

## Rule Sets

Each season has a `scoring_rule_set` column (`"alpha"` | `"beta"`, default `"alpha"`). The active rule set determines point calculation, confirmation logic, and contact square requirements.

A rule set is a versioned identity, not a per-season flag. Many seasons can share one rule set, and the same value scores those seasons identically forever. When rules change, add a new enum value plus a new `ScoringRuleSet`; existing seasons keep their old value.

### Rule Set Registry

| Value | Seasons | Summary |
|---|---|---|
| `alpha` | Alpha season | 1 pt per QSO on operator square. Contact square optional. |
| `beta` | Beta season | Mode-weighted (1 DIGI / 2 phone-CW) + double on confirmation. Contact square required. |

Keep this table current when adding a rule set or assigning one to a season.

### Alpha Rule Set

- **1 point** per accepted QSO, awarded on the operator's WAL square.
- Contact square (`GRIDSQUARE`) is optional — stored when provided but does not affect scoring.

### Beta Rule Set

- **1 point** for DIGI QSOs (unconfirmed).
- **2 points** for CW / SSB / FM QSOs (unconfirmed).
- **Double points** when the QSO is confirmed (both stations logged it).
- Contact square is **required** — the field cannot be empty. DX (foreign) contacts are entered as the literal `DX`; they score base points but never confirm (no WAL square to swap).

#### Confirmation

A QSO is confirmed when the contact station has a matching QSO already in the system satisfying all of:

| Field | Requirement |
|---|---|
| `band` | Equal |
| `mode` | Equal |
| `operatorSquare` | Equal to the other QSO's `contactSquare` |
| `contactSquare` | Equal to the other QSO's `operatorSquare` |
| `qsoAt` | Within ±300 seconds (5 minutes) |
| Contact callsign | `UPPER(user.name)` of the other user matches this QSO's `contactCallsign` |
| Banned | Other user must not be banned |

Confirmation is **dynamic**: when either station logs or imports a QSO, if a matching QSO from the other side already exists, both stations immediately receive their full confirmed score. When a confirmed QSO is deleted, both stations lose the bonus.

#### Beta scoring math

```
base = mode === "DIGI" ? 1 : 2
inserting station scores: base × (confirmed ? 2 : 1)
confirming station gets extra: +base_of_their_own_qso   (they go from 1× to 2×)
```

#### Bulk import (beta)

Because confirmation must be checked per-QSO, beta seasons use per-QSO `scoreInsert` calls inside `commitUpload` instead of the batch `scoreBulkInsert` path. This ensures confirmation bonuses are awarded immediately when importing a log that matches QSOs already on file.

## Per-QSO Score

Each QSO carries its own score, shown in the station log (`/log`) and the admin QSO tab. The value is the points that single QSO contributes to its operator square under the season's rule set:

- **Alpha**: always `1`.
- **Beta**: `base × (confirmed ? 2 : 1)`, i.e. `1`, `2`, or `4`.

Confirmation is **symmetric** — both sides of a confirmed pair independently show their own doubled value, so a confirmed QSO needs no special "shared" representation. A confirmed QSO is marked with a green checkmark badge next to the score (tooltip explains the doubled points).

### Materialization

The per-QSO score is materialized on the `qso` row (`score` integer, `confirmed` boolean) instead of computed on every read. `qsos.list` and `admin.qsos.list` select the columns directly.

The columns are maintained by `syncQsoScores(tx, seasonId)` (`apply-deltas.ts`), called inside the transaction of **every** write that can change scoring: `qsos.create` / `update` / `delete`, bulk import (`applyBulkScoreDeltas`), `admin.qsos.delete` / `deleteMany`, and `recomputeSeasonScores` (which covers ban/unban). It is the single reconciliation point:

1. Run `ruleSet.scoreSeasonQsos(tx, seasonId)` — `Map<qsoId, { points, confirmed }>` for every non-banned QSO. Beta reuses the same confirmation detection as `computeExpectedScores` (extracted into `detectConfirmedIds`), so materialized values always match awarded aggregate points.
2. Diff against the stored columns and `UPDATE` only the rows that changed (preserving `updatedAt` — a scoring sync is not a user edit).

This recompute-and-diff approach is deliberate: confirmation is symmetric and dynamic, so one insert/delete can flip a counterpart QSO too. Writes are rare; reads stay cheap. Banned users' QSOs reconcile to `0`, matching their removal from aggregate tables; unban restores them via recompute.

**Backfill**: the columns ship with `DEFAULT 0` / `false`, so existing rows read `0` until their season is next written or recomputed. After deploying, run **Perskaičiuoti** (`admin.scores.recompute`) once per season to populate them — especially ended seasons, which receive no further writes. Aggregate scores are unaffected by this change, so the drift detector stays clean regardless.

## Points

Points are per-season. Deleting a QSO loses its points immediately.

## Duplicate Rules

Two layers; in both the contact callsign is the **base call** (suffixes/prefixes stripped at insert — see Callsign Normalization in [qso-logging.md](qso-logging.md)), so `LY2EN` and `LY2EN/P` from the same square collapse to one identity.

- **Exact duplicates** prevent accidental double submission: same user already has the same season, callsign, band, mode, timestamp, operator square, and contact square.
- **Game duplicates** are scoring rules: only one QSO with the same callsign, band, mode, operator square, and contact square scores per Lithuanian calendar day (`Europe/Vilnius`). Changing either square lets another such QSO score that day.

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
- **Individual standings** (`scoring.individualStandings`) — operators ranked by total season points (desc): callsign, team color, point total, plus `qsoCount` and `squaresWorked` (distinct operator squares). Banned users are excluded from both the points rows and the activity aggregates. Per-player team mapping stays hidden during an active season; it's revealed only for ended seasons on the leaderboard ([leaderboard.md](leaderboard.md)).

- **Control timeline** (`scoring.controlTimeline`) — replays `square_control_history` for the
  season to produce `{ at, yellow, green, red }` snapshots: starting from a zero baseline at the
  season start, each ownership change decrements the losing team and increments the gaining team
  (nullable = uncontrolled), emitting one point per distinct timestamp. Powers the leaderboard's
  control-over-time chart ([leaderboard.md](leaderboard.md)). Because it is a pure replay of the
  same append-only log, its final values match `teamStandings.squaresControlled`.

Two more `publicProcedure`s in the same router power the in-app liveness signals, both
anonymized (team + square + time only, never a callsign) — see [activity-feed.md](activity-feed.md):

- **`scoring.activityFeed`** — recent takeovers from `square_control_history`.
- **`scoring.recentSquares`** — square codes with a QSO in the last 2h (`qsoAt`-based), for the map pulse.
- **`scoring.recentSquareActivity`** — for one square, the band/mode combos with a QSO in the last 2h (same window as the pulse), grouped and ordered by QSO count desc. Powers the activity chips in `SelectedSquareStatsBox`.

## Implementation

### Rule set dispatch

`getScoringRuleSet(scoringRuleSet: "alpha" | "beta"): ScoringRuleSet` (`packages/api/src/scoring/index.ts`) returns the right rule set object. The `ScoringRuleSet` interface (`packages/api/src/scoring/types.ts`) defines:

- `usePerQsoScoring: boolean` — when true, `commitUpload` loops through `scoreInsert` per QSO instead of calling `scoreBulkInsert`.
- `validateInsert` — rejects invalid QSOs (contact square, game dups).
- `scoreInsert` / `scoreDelete` — compute per-QSO score deltas (including confirmation logic for beta).
- `scoreBulkInsert` / `filterBulkInserts` — batch path for alpha.
- `computeExpectedScores` — ground-truth aggregation used by drift detection and recompute.

### Materialized score tables

Scores are stored, not computed on read (full-season aggregation across tens of thousands of QSOs is too expensive for map/leaderboard reads). Schema in `packages/db/src/schema/scoring.ts`:

| Table | Key columns | Notes |
|---|---|---|
| `square_score` | `season_id`, `square_code`, `team`, `points` | Unique on `(season_id, square_code, team)`. One row per active team per square. `points >= 0` check. |
| `user_season_score` | `season_id`, `user_id`, `points` | Individual leaderboard. Unique on `(season_id, user_id)`. `points >= 0` check. |
| `square_control_history` | `season_id`, `square_code`, `before_team`, `after_team`, `created_at` | Append-only log of takeovers (ownership changes). Teams nullable (null = uncontrolled). Indexed on `(season_id, created_at)`. Powers the in-app activity feed ([activity-feed.md](activity-feed.md)) and the leaderboard control-over-time chart ([leaderboard.md](leaderboard.md)). Rows written by `applyScoreDeltas` in the same transaction as the score change. |

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
4. Only if the state changed, calls `applyUserBanScoreChange` (`packages/api/src/scoring/apply-deltas.ts`). For alpha seasons this uses a count-based delta. For beta seasons (mode-weighted + confirmation), it triggers a full `recomputeSeasonScores` because a count-based delta would be incorrect.

The change-guard prevents double-counting on a repeated ban.

### Drift detector

The score tables are a denormalized cache; `qso` is the source of truth. They can drift if a mutation bypasses the delta path (forgotten ban recompute, delta-math bug, direct DB edit).

`computeScoreDrift` (`packages/api/src/scoring/drift.ts`) uses each rule set's `computeExpectedScores(db, seasonId)` to derive ground-truth aggregates (excluded banned users) and compares against stored rows. Per season it reports mismatched square rows, mismatched user rows, and net stored-minus-expected point difference. Surfaced per season in the admin dashboard ([admin.md](admin.md)).

For beta, `computeExpectedScores` performs an in-memory confirmation match: pairs up QSOs where both sides have a matching entry, assigns double points to confirmed pairs and base points to unconfirmed ones.

### Repair: recompute scores

When the badge is red, an admin clicks **"Perskaičiuoti"** (`admin.scores.recompute`), running `recomputeSeasonScores` (`packages/api/src/scoring/apply-deltas.ts`) in a transaction: it **wipes** the season's score rows and **rebuilds** them from `ruleSet.computeExpectedScores`. Idempotent; afterward the season is drift-free.

### Backfill: rebuild control history

`square_control_history` is written live by `applyScoreDeltas`, so it only covers takeovers that happened **after the table existed**. To reconstruct the full history (e.g. it was added mid-season, or drifted), `rebuildControlHistory(tx, seasonId)` (`packages/api/src/scoring/rebuild-control-history.ts`) replays the season from the source-of-truth `qso` table:

- Loads every non-banned QSO ordered by `qsoAt` and expands them into time-ordered additive **score events**. Each QSO contributes its base points at `qsoAt`; under beta a confirmed QSO contributes a second equal event at its confirmation time (the later `qsoAt` of the matched pair — the doubling). The per-`(square, team)` sum therefore equals `computeExpectedScores`, so the reconstructed end state matches the materialized score tables.
- Replays events in time order, grouping by timestamp, and emits one history row per ownership change, **stamped with the causing contact's `qsoAt`** (backfilled rows have no real insert time). This makes the timeline chart a clean game-time curve.
- **Wipes** the season's history rows and re-inserts the full reconstruction (full rebuild, not gap-only — one consistent algorithm and timestamp basis, verifiable against current scores).

Run it with `pnpm -F @WAL-GO/api backfill:control-history <seasonId> [--dry-run]` (`src/scripts/rebuild-control-history.ts`). `--dry-run` rebuilds inside a transaction and rolls back, printing the row count without writing. Drives the leaderboard control-over-time chart ([leaderboard.md](leaderboard.md)).

## Discord announcements

Square control changes (takeovers) post to Discord. Detection lives in `applyScoreDeltas`, the single chokepoint all score changes pass through. See [discord-announcements.md](discord-announcements.md).
