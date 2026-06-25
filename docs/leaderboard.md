# Leaderboard

The leaderboard (`/leaderboard`, route `apps/web/src/routes/leaderboard.tsx`) celebrates
the result of a finished season: the winning team, team stats, and an individual ranking
of operators. It is the payoff that reveals per-player team standings, which are
intentionally hidden while a season is active.

## Visibility

- **Authenticated only.** The route guards in `beforeLoad` (same `getUser` +
  redirect-to-sign-in pattern as `/map` and `/join-season`).
- **Header link** appears only when the viewer is signed in **and** at least one season
  has ended. `header.tsx` queries `seasons.list` and conditionally adds the
  `Rezultatai` link (Trophy icon) to the authenticated nav.
- If no season has ended, the page itself shows an empty state
  ("Dar nėra pasibaigusių sezonų").

## Season selector

Ended seasons (`seasons.list` filtered to `status === "ended"`) are sorted newest first.
The page defaults to the most recent one. When more than one ended season exists, a
`Select` dropdown lets the viewer switch between them; switching re-fetches standings and
re-fires the winner confetti.

## Map

Below the winner hero, a `MapView` renders the territory control for the selected season
(`h-96`, rounded border, no geolocation). Square selection state is local to the page;
clicking a square highlights it on the map (same `selectedSquareCode` / `onSquareSelect`
pattern as `/map`) but does not open a stats panel on the leaderboard.

## Control timeline

Between the map and the team cards, `ControlTimelineChart`
(`apps/web/src/domains/season/control-timeline-chart.tsx`) draws how many squares each team
**controlled** over the course of the season. It is a recharts step line chart (one
`stepAfter` line per team, colored `--brand-golden` / `--brand-olive` / `--brand-rust`) wrapped
in the shared shadcn `Chart` primitives (`@WAL-GO/ui/components/chart`, recharts under the hood).
The X axis is real time (`scale="time"`, `MM-dd` ticks, Vilnius-formatted), the Y axis is the
controlled-square count. It renders nothing when fewer than two data points exist (a season with
no takeovers yet).

Data comes from `scoring.controlTimeline` (see [scoring.md](scoring.md)), which reconstructs the
per-team controlled-square count at every ownership change from `square_control_history`.

## Data

All four queries are `publicProcedure`s; access is enforced at the route/header level.

- `seasons.list` — season names, dates, and derived `status`.
- `scoring.teamStandings` (scoped to the selected season) — `{ team, points,
  squaresControlled }`, already sorted with the winner first. Drives the winner hero and
  the three `TeamStandingCard`s (% of `TOTAL_SQUARES`).
- `scoring.controlTimeline` (scoped to the selected season) — `{ at, yellow, green, red }`
  snapshots of controlled-square counts over time. Drives `ControlTimelineChart`.
- `scoring.individualStandings` (scoped to the selected season) — per operator:
  `callsign`, `team`, `points`, `qsoCount`, `squaresWorked`, ordered by points desc.
  Banned users are excluded. Rendered as a table: rank, callsign, team, points, QSO count,
  squares worked.

## Confetti

The `useWinnerConfetti(seasonId, enabled)` hook
(`apps/web/src/domains/season/use-winner-confetti.ts`) fetches `teamStandings`, and once a
winner is known fires a two-burst `fireTeamConfetti` in the winner's colors. It fires once
per season (re-fires when `seasonId` changes), skips when the top team has no points/squares,
and respects `prefers-reduced-motion: reduce`.

Where it runs with `enabled`:

- **Leaderboard** — always (the page only renders for ended seasons).
- **Map** (`/map`) and **homepage** (`/`) — only **between seasons**: no active season but a
  recently ended one exists (`!activeSeason && !!recentlyEndedSeason`). Scoped to the
  recently ended season's id.

## Between-seasons results on home & map

When the previous season has ended and the next has not started:

- **Homepage** shows the winner via `SeasonWinnerHero` above the team cards, switches the
  section eyebrow to `Sezono rezultatai · {season name}`, and (for signed-in users) shows a
  `Visi rezultatai` link to `/leaderboard`.
- **Map sidebar** already renders `SeasonResultsBox` for the recently ended season
  (see [map.md](map.md)); the confetti hook adds the celebration.

## Shared team helpers

Team constants — `TEAMS` order + `Team` type, `TOTAL_SQUARES`, labels, `TEAM_CONFIG`
(dot/bar classes), result-card classes, confetti colors, `fireTeamConfetti`, and the
Lithuanian plural forms (`POINT_FORMS`, `SQUARE_FORMS`) — live in
`apps/web/src/domains/season/team.ts`, the single source consumed by the leaderboard,
homepage, map, `SelectedSquareStatsBox`, `SeasonResultsBox`, and `join-season`. The winner
box is the reusable `SeasonWinnerHero` component
(`domains/season/season-winner-hero.tsx`); a single team card is `TeamStandingCard`
(`domains/season/team-standing-card.tsx`, `showPoints` toggles the points line), shared by
the leaderboard and homepage.

## Related Docs

- [scoring.md](scoring.md), [seasons.md](seasons.md), [overview.md](overview.md)
