# Achievements

Operators unlock achievements for coverage, volume, consistency, and a few one-off feats.

Two surfaces:

- **`/profile/$callsign`** shows **earned** stamps only, for any operator ([profile.md](profile.md)).
- **`/achievements`** (`apps/web/src/routes/achievements.tsx`) is the signed-in operator's own
  full catalogue — every achievement, locked ones grayed with a progress bar, grouped into
  sections (Teritorija, Eterio darbas, Patvirtinimai, Juostos ir rūšys, Nuoseklumas,
  Bendruomenė) with a per-section earned count and an overall progress bar in the header.
  It is personal: there is no route to another operator's locked list.

Both render the same `AchievementStamp` component
(`apps/web/src/domains/profile/achievement-stamp.tsx`) — a postage stamp with a circular
postmark carrying the unlock date. Locked stamps drop the postmark and the tilt, mute to
`text-muted-foreground`, and gain a progress bar.

### The perforated edge

Stamps use `.stamp-perforation` (`packages/ui/src/styles/globals.css`), **not** the older
`.qsl-perforation` the Discord QSL card uses.

`.qsl-perforation` masks a single tiled grid of holes anchored to the top-left corner. The
bottom and right rows therefore only land correctly when the element measures an exact
multiple of `--pitch`. That is fine for the fixed-size QSL stamp, but an achievement stamp is
sized by its description text, so the bottom edge was cut mid-hole at most heights.

`.stamp-perforation` gives each edge its own strip, repeating along one axis and anchored to
that edge (`repeat-x` for top/bottom, `repeat-y` for left/right, with the bottom and right
strips positioned from `100%`). The bottom row sits on the bottom whatever the height.

The notches are **painted, not masked** — background layers stack without a compositing
operator, whereas the four-layer mask this would otherwise need depends on `mask-composite`,
which Safari only shipped recently. The trade is that notches are painted in `--stamp-notch`,
so **a stamp must sit on that color**. It defaults to `--background` (the page ground, which is
where both surfaces put them); override the variable when placing a stamp on a card.

Stamps also carry `h-full` down the chain so every stamp in a grid row measures the same,
regardless of description length.

When adding an achievement, add its group to `GROUP_LABELS` in the `/achievements` route or it
falls into a "Kita" section.

## Architecture

**Definitions live in code; only outcomes live in the database.** Adding an achievement is a
code change, not a migration — unless it needs a counter that does not exist yet.

**Progress is stored, never derived on read.** Evaluating a growing catalogue on every profile
view would cost a query per achievement per view. Instead the catalogue is evaluated on write
and the result is read back as plain rows.

The dividing line: **materialize what the write path needs, query what the read path needs.**
Achievement evaluation runs on every QSO write, so its counters are materialized. The profile
map runs on page view, so its squares are queried from `qso` directly.

### Tables

Schema in `packages/db/src/schema/achievements.ts`.

| Table | Key columns | Notes |
|---|---|---|
| `user_stat` | `user_id`, `season_id`, counters | One row per user per season, **plus a career row with a null `season_id`**. Unique on `(user_id, season_id)` with `NULLS NOT DISTINCT`, so the career row cannot duplicate. |
| `user_achievement` | `user_id`, `achievement_id`, `season_id`, `progress`, `target`, `unlocked_at` | `season_id` is null for career-scoped achievements. Unique on `(user_id, achievement_id, season_id)`, `NULLS NOT DISTINCT`. |

`user_stat` counters: `qso_count`, `points`, `confirmed_count`, `distinct_callsigns`,
`distinct_squares`, `bands` (`text[]`), `modes` (`text[]`), `night_qso_count` (00:00–05:00
Vilnius), `active_days`, `longest_streak`, `first_qso_at`, `last_qso_at`.

**Why a separate career row.** Distinct counts cannot be summed across seasons — an operator
who worked square `A05` in two seasons has worked one square, not two. The career row is
aggregated from `qso` with no season filter, exactly like the season rows.

### Definitions

`packages/api/src/achievements/definitions.ts` exports `ACHIEVEMENTS`, a flat list of:

```ts
interface AchievementDefinition {
  id: string;
  group: string;   // collapses tiers of one idea in the UI
  tier: number;
  scope: "season" | "career";
  target: number;
  label: string;         // Lithuanian
  description: string;   // Lithuanian
  icon: string;          // lucide-react name
  progress(context: AchievementContext): number | Promise<number>;
}
```

Labels are Balatro-style — short, punchy noun names with personality ("Darbo arklys",
"Pelėda", "Bandomasis triušis"), not descriptive titles. The description below the label
carries the actual requirement.

`progress` is normally a **pure function over already-loaded counters** — evaluating the whole
catalogue costs zero queries. Tiered families are generated by the `tiered()` helper so one
spec produces every tier.

Icons are resolved through an explicit map in `achievement-stamp.tsx` rather than a dynamic
lucide lookup, so an unknown icon name fails visibly instead of bloating the bundle.

### The escape hatch

Some achievements no counter can express — "worked an operator from all three teams", "10
confirmed QSOs in one day". Those use `context.extra`, a set of **lazily loaded, memoized**
loaders:

```ts
interface ExtraLoaders {
  workedTeams(): Promise<Set<string>>;
  bestConfirmedDay(): Promise<number>;
  bestQsoDay(): Promise<number>;
  february16QsoCount(): Promise<number>;
  testSeasonCount(): Promise<number>;
}
```

What bounds their cost:

- **An unlock is permanent.** `evaluateOne` returns early for any achievement that already has
  an `unlocked_at`, so its loader never runs again. Adding weird, expensive achievements stays
  affordable because each one is expensive at most until it is earned.
- **Loaders are batched.** `createExtraLoaders` is built once per evaluation for the whole set
  of users and hands each user a view onto the shared, memoized result. None of these queries
  index well — `workedTeams` joins on `upper(user.name) = qso.contact_callsign`, an expression
  no index covers — and the achievements that need them stay locked for most operators
  forever, so issuing them per user would put an unbounded query fan-out on the write path.

Add a loader here when the requirement is one-off. Add a counter to `user_stat` when it will
be reused across several achievements.

## Reconciliation

`syncAchievements(tx, seasonId)` runs at the end of **`syncQsoScores`**
(`packages/api/src/scoring/apply-deltas.ts`) — the single chokepoint every scoring write
already passes through: `qsos.create` / `update` / `delete`, bulk import, `admin.qsos.delete` /
`deleteMany`, and `recomputeSeasonScores` (which covers ban/unban). Same transaction, so stats
can never diverge from scores.

It runs **last** inside `syncQsoScores`, after the per-QSO `score` and `confirmed` columns are
written, because the counters read them.

Two steps:

1. **`syncUserStats(tx, seasonId, userIds?)`** — recompute-and-write for the given users, or
   season-wide when `userIds` is omitted. Season rows and career rows are built from `qso` by
   grouped aggregate queries; streaks and active days come from distinct Vilnius days computed
   in JS. A user in scope with no remaining QSOs has their stat row deleted, so a user whose
   last QSO was removed reconciles to zero. Banned users are excluded by an `innerJoin` on
   `user.banned = false`, matching the scoring tables.
2. **`evaluateAchievements(...)`** — runs the catalogue over the loaded counters and upserts
   progress. `unlocked_at` is preserved with `coalesce` on conflict, so an unlock is never
   reset by a later recompute.

### User scope

Unlike the per-QSO score reconciliation, this pass is **not** season-wide by default. Rebuilding
season *and* career aggregates and re-evaluating the catalogue for every operator in the season
would make a single logged QSO scale with the size of the season.

Instead, `syncQsoScores(tx, seasonId, touchedUserIds)` scopes it to:

- the operators the calling write acted on (`touchedUserIds`), and
- every operator whose QSO rows that same sync actually rescored — which is what picks up the
  **counterpart of a confirmation flip**, whose stats change without them writing anything.

Omitting `touchedUserIds` reconciles the whole season. Only `recomputeSeasonScores` and the
backfill do that, and both are deliberate admin actions.

Returns the newly unlocked rows, so a caller can announce them
([discord-announcements.md](discord-announcements.md) — not wired up yet).

## Backfill

Existing seasons have never passed through the chokepoint, and an **ended** season receives no
further writes, so nothing would ever evaluate it.

Run it from the **admin dashboard** ([admin.md](admin.md)): each season card has a
**"Pasiekimai"** button, and one above the list covers every season. **"Bandymas"** next to it
is a dry run. Both call `admin.achievements.backfill`
(`{ seasonId?, dryRun }` → `{ seasonId, seasonName, unlocked }[]`), which delegates to
`backfillAchievements` in `packages/api/src/achievements/backfill.ts`.

Every season is reconciled in **one** transaction, which a dry run rolls back — so the counts
are real but nothing is written, and a career-scoped achievement unlocked while reconciling the
first season stays unlocked for the rest of the pass instead of being counted again per season.
A transaction per season would report a dry-run figure several times larger than the real run.

Run it once after deploying, and again whenever the catalogue gains an achievement that ended
seasons should be able to award.

The admin **Perskaičiuoti** button (`admin.scores.recompute`) also reconciles achievements for
that season, because `recomputeSeasonScores` ends by calling `syncQsoScores`.

## Catalogue

| Group | Scope | Tiers | Measures |
|---|---|---|---|
| `squares` | career | 10 / 25 / 50 / 100 / 210 | Distinct WAL squares worked |
| `qso` | career | 100 / 500 / 1000 / 5000 | QSOs logged |
| `callsigns` | career | 25 / 50 / 100 / 250 | Distinct callsigns worked |
| `confirmed` | career | 10 / 50 / 200 | Confirmed QSOs |
| `bands` | career | 3 / 5 / 10 / all | Distinct bands |
| `streak` | season | 3 / 7 / 14 / 30 | Consecutive Vilnius days on air |
| `night` | career | 10 / 50 | QSOs between 00:00 and 05:00 |
| `season-squares` | season | 5 / 25 / 50 / 100 / 210 | Squares worked in one season |
| `modes-all` | season | all 4 | Every mode in one season |
| `points` | season | 100 / 500 / 1500 | Points scored in one season |
| `worked-all-teams` | career | 3 | Worked all three teams (`extra`) |
| `confirmed-day-100` | season | 100 | 100 confirmed QSOs in one day (`extra`) |
| `qso-day-500` | season | 500 | 500 QSOs in one day (`extra`) |
| `season-active-days-20` | season | 20 | 20 active days in one season |
| `february-16` | career | 1 | A QSO on February 16, any year (`extra`) |
| `tester` | career | 1 | Membership in an alpha/beta rule-set season (`extra`) |

Season-scoped achievements can be earned in any season; the profile shows the best result the
operator has ever reached. If several seasons unlocked the same achievement, the postmark uses
the earliest unlock date so it consistently records when the achievement was first earned.

Descriptions interpolate the tier target, so a local `pluralizeLt` helper in `definitions.ts`
picks the correct Lithuanian noun case for the number (1 → singular, 2–9 → plural,
10–19 and round tens → genitive plural).

`tester` only unlocks for operators who logged at least one QSO in some season — evaluation
runs over users touched by a season's QSOs, so a membership with an empty log is never seen.
That is intentional: joining without transmitting is not participating.

Keep this table current when adding an achievement.

## Related Docs

- [profile.md](profile.md), [scoring.md](scoring.md), [db.md](db.md),
  [qso-logging.md](qso-logging.md)
