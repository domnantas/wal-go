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
| `seasons.list` | `publicProcedure` query | Returns all seasons with derived status, sorted by `starts_at desc`. |
| `seasons.myMembership` | `protectedProcedure` query | Returns the current user's membership in the active season, or `null`. |
| `seasons.join` | `protectedProcedure` mutation | Idempotent join operation; the server selects the team. |
