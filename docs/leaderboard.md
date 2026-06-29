# Leaderboard

The leaderboard (`/leaderboard`, route `apps/web/src/routes/leaderboard.tsx`) shows the
winning team, team stats, and an individual ranking of operators — both for the **live
active season** and for finished seasons. Per-player callsign+team standings used to be
hidden during active seasons; they are now visible live to signed-in users (see the player
visibility experiment in [overview.md](overview.md)).

## Visibility

- **Authenticated only.** The route guards in `beforeLoad` (same `getUser` +
  redirect-to-sign-in pattern as `/map` and `/join-season`).
- **Header link** appears when the viewer is signed in **and** at least one season is
  `active` or `ended`. `header.tsx` queries `seasons.list` and conditionally adds the
  `Rezultatai` (Trophy) link to the authenticated nav.
- If there are no such seasons, the page shows an empty state ("Dar nėra sezonų").

## Season selector

Leaderboard seasons (`seasons.list` filtered to `status === "active" || "ended"`) are sorted
newest first. The page defaults to the live active season if one exists, else the most recent
ended one. When more than one exists, a `Select` dropdown switches between them; switching
re-fetches standings.

For the active season a **"Gyvai"** badge and a "Baigsis …" subtitle render, the winner hero
and confetti are suppressed (`winner && !isLive`, `useWinnerConfetti(..., !isLive)`), the map
is hidden (`!isLive`), and the standings update live as scores change.

## Map

For **ended** seasons only (`!isLive`), a `MapView` below the winner hero renders the final
territory control (`h-96`, rounded border, no geolocation). The live active season hides the
map — the live map lives at `/map`. Square selection state is local to the page; clicking a
square highlights it (same `selectedSquareCode` / `onSquareSelect` pattern as `/map`) but does
not open a stats panel on the leaderboard.

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

`seasons.list`, `teamStandings`, and `controlTimeline` are `publicProcedure`s;
`individualStandings` is a `protectedProcedure` (it returns callsigns, so it requires sign-in
even though the route is already auth-gated).

- `seasons.list` — season names, dates, and derived `status`.
- `scoring.teamStandings` (scoped to the selected season) — `{ team, points,
  squaresControlled }`, already sorted with the winner first. Drives the winner hero and
  the three `TeamStandingCard`s (% of `TOTAL_SQUARES`).
- `scoring.controlTimeline` (scoped to the selected season) — `{ at, yellow, green, red }`
  snapshots of controlled-square counts over time. Drives `ControlTimelineChart`.
- `scoring.individualStandings` (`protectedProcedure`, scoped to the selected season) — per
  operator: `userId`, `callsign`, `team`, `points`, `qsoCount`, `squaresWorked`, ordered by
  points desc. Banned users are excluded. Rendered as a table: rank, callsign, team, points,
  QSO count, squares worked.

## Confetti

The `useWinnerConfetti(seasonId, enabled)` hook
(`apps/web/src/domains/season/use-winner-confetti.ts`) fetches `teamStandings`, and once a
winner is known fires a two-burst `fireTeamConfetti` in the winner's colors. It fires once
per season (re-fires when `seasonId` changes), skips when the top team has no points/squares,
and respects `prefers-reduced-motion: reduce`.

Where it runs with `enabled`:

- **Leaderboard** — only for the selected **ended** season (`!isLive`); suppressed while a
  live active season is shown.
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
