# Seasons

WAL GO is played in seasons. A season has a start and end date; duration can vary. Beta seasons are shorter, typically lasting days or weeks.

## Lifecycle

Season status is derived from dates; there is no separate `status` field:

| Status | Condition |
| --- | --- |
| `upcoming` | `now() < starts_at` |
| `active` | `starts_at <= now() <= ends_at` |
| `ended` | `now() > ends_at` |

Only one season is active at a time. This is currently enforced during seeding, without a database constraint.

## Teams

There are three fixed teams: `yellow`, `green`, and `red`. Teams exist as the `team_color` enum; there is no separate teams table. A user can belong to different teams in different seasons.

## Joining (spinning the wheel)

1. The user opens `/join-season`.
2. If there is an active season and the user has not joined yet, they see the "Spin the wheel" button.
3. Pressing the button calls the `seasons.join` mutation. The **server** randomly selects a team (`yellow`/`green`/`red`) and inserts a row into `season_membership`.
4. Repeated calls return the same membership. The team is fixed the first time the user joins and cannot be changed during the same season.

The `(user_id, season_id)` unique index guarantees idempotency even under concurrent requests.

### Wheel UI

The wheel is a 320×320px (h-80 w-80) conic-gradient circle divided into three equal segments (golden/olive/rust). Each segment displays its team name label. A center hub overlays the rotation pivot.

The pointer sits at 3 o'clock (90° clockwise from top). Landing offsets are computed as `R ≡ (90° − C) mod 360°` where C is each segment's center angle: yellow=60° → R=30°, green=180° → R=270°, red=300° → R=150°. A ±50° random jitter is applied.

When the wheel lands, `canvas-confetti` fires a burst from both sides of the screen in the winning team's colors.

## Season creation

During the beta phase, seasons are added directly to the database through `pnpm db:studio`. An admin UI will be added later.

## Game Context (remaining systems)

Seasons are only the entry point into the game. The rest of the game flow, including radio contacts (QSO), WAL squares, points, and territory control, will be described in separate documents:

- `docs/squares.md` - how Lithuania is divided into WAL squares.
- `docs/scoring.md` - how QSO entries become points and how square control is determined.

Currently, `docs/seasons.md` covers **only** seasons and team membership.

## Schemas

`packages/db/src/schema/seasons.ts`:

- `season` - season record (`name`, `starts_at`, `ends_at`, `public_id`).
- `team_color` - Postgres enum (`yellow` | `green` | `red`).
- `season_membership` - user membership in a specific season (`user_id`, `season_id`, `team`, `joined_at`).

## API (`packages/api/src/routers/seasons.ts`)

| Procedure | Type | Description |
| --- | --- | --- |
| `seasons.current` | `publicProcedure` query | Returns the active season or `null`. |
| `seasons.list` | `publicProcedure` query | Returns all seasons with derived status, sorted by `starts_at asc`. |
| `seasons.myMembership` | `protectedProcedure` query | Returns the current user's membership in the active season, or `null`. |
| `seasons.join` | `protectedProcedure` mutation | Idempotent join operation; the server selects the team. |

## Countdown surfaces

Season countdowns are based on `seasons.list` rows with `status: "upcoming"`.
They tick on the client and invalidate season membership/current-season queries
when the countdown reaches zero.

The map sidebar shows season timing through `SeasonSidebarBox`:

- When a season is active, it renders `SeasonProgressBox` with the season progress bar, time remaining, and a CTA to `/join-season`.
- When no season is active, it renders whatever combination of `SeasonCountdownBox` and `SeasonResultsBox` applies:
  - Upcoming season → `SeasonCountdownBox` with a live countdown to `starts_at`.
  - Recently ended season → `SeasonResultsBox` with the final standings.
  - Both → countdown above, results below.
  - Neither → nothing rendered.

The homepage hero and `/log` page use `SeasonCountdownCard` for the same
upcoming-season state. The homepage shows the countdown in the hero when there is
no active season. The log page shows it where upload controls would otherwise
appear, so users can see when QSO logging will open.

Transitions happen automatically: each timing box fires `onComplete` when its threshold is crossed, which invalidates season queries and triggers a refetch.
