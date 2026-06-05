# Seasons

WAL GO is played in seasons. A season has start and end dates; duration varies (beta seasons are shorter — days or weeks).

## Lifecycle

Status is derived from dates — no `status` field:

| Status | Condition |
|---|---|
| `upcoming` | `now() < starts_at` |
| `active` | `starts_at <= now() <= ends_at` |
| `ended` | `now() > ends_at` |

Only one season is active at a time, enforced during seeding (no DB constraint).

## Teams

Three fixed teams: `yellow`, `green`, `red`, as the `team_color` enum — no teams table. A user can be on different teams in different seasons.

## Joining (spinning the wheel)

1. User opens `/join-season`.
2. With an active season not yet joined, they see "Spin the wheel".
3. Pressing it calls `seasons.join`. The **server** randomly picks a team and inserts a `season_membership` row.
4. Repeated calls return the same membership — fixed on first join, immutable for the season. The `(user_id, season_id)` unique index guarantees idempotency under concurrency.

### Wheel UI

A 320×320px (`h-80 w-80`) conic-gradient circle of three equal segments (golden/olive/rust), each labeled with its team, with a center hub over the pivot. Pointer sits at 3 o'clock (90° clockwise from top). Landing offsets: `R ≡ (90° − C) mod 360°` where C is each segment's center angle — yellow=60°→R=30°, green=180°→R=270°, red=300°→R=150°, with ±50° random jitter. On landing, `canvas-confetti` fires a burst from both sides in the winning team's colors.

## Schemas (`packages/db/src/schema/seasons.ts`)

- `season` — `name`, `starts_at`, `ends_at`, `public_id`.
- `team_color` — Postgres enum (`yellow` | `green` | `red`).
- `season_membership` — `user_id`, `season_id`, `team`, `joined_at`.

Seasons are created/edited/deleted by admins via the Seasons tab ([admin.md](admin.md)).

## API (`packages/api/src/routers/seasons.ts`)

| Procedure | Type | Description |
|---|---|---|
| `seasons.current` | `publicProcedure` query | Active season or `null`. |
| `seasons.list` | `publicProcedure` query | All seasons with derived status and `member_count`, `starts_at asc`. |
| `seasons.myMembership` | `protectedProcedure` query | Current user's membership in the active season, or `null`. |
| `seasons.join` | `protectedProcedure` mutation | Idempotent join; server selects the team. |

## Countdown surfaces

Countdowns are based on `seasons.list` rows with `status: "upcoming"`. They tick on the client and invalidate season-membership / current-season queries when they reach zero.

The map sidebar shows timing via `SeasonSidebarBox`:

- Active season → `SeasonProgressBox` (progress bar, time remaining, member count, CTA to `/join-season`).
- No active season → some combination of:
  - Upcoming → `SeasonCountdownBox` (live countdown to `starts_at`).
  - Recently ended → `SeasonResultsBox` (final standings).
  - Both → countdown above, results below.
  - Neither → nothing.

The homepage hero and `/log` use `SeasonCountdownCard` for the upcoming state (homepage in the hero when no active season; log page where upload controls would appear). Each timing box fires `onComplete` when its threshold crosses, invalidating season queries and refetching.

## Related

- [scoring.md](scoring.md) — how QSOs become points and how square control is determined.
- [map.md](map.md) — the WAL grid and rendering.
