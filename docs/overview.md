# WAL GO — Game Overview

WAL GO is a web-based territory competition for Lithuanian amateur radio operators, inspired by Pokémon GO and Ingress. Operators compete in seasons to control WAL grid squares by logging real radio contacts (QSOs).

## Core Concept

Lithuania is divided into a grid of WAL squares (10′ × 10′ lat/lon cells). Three teams compete to hold as many squares as possible within a season. A team holds a square when it has more points on that square than either rival team. Points come from QSOs logged by team members whose operating location or contacted station falls within that square.

## Player Lifecycle

1. **Register** — create an account with email/password (see [auth.md](auth.md))
2. **Add callsign** — required before joining a season; stored on user profile
3. **Join a season** — available while a season is active (see [seasons.md](seasons.md))
4. **Spin the wheel** — server assigns player to yellow, green, or red team at random; assignment is permanent for that season
5. **Log QSOs** — when the season is active and the player has joined it, drop a Cabrillo `.log`/`.cbr`/`.cabrillo` file or add QSOs manually on `/log`; each valid QSO awards points to WAL squares (see [qso-logging.md](qso-logging.md))
6. **Watch the map** — main screen at `/map` shows Lithuania with squares colored by controlling team (see [map.md](map.md))

## Season Lifecycle

| Status    | Condition                         |
|-----------|-----------------------------------|
| Upcoming  | `now < startsAt`                  |
| Active    | `startsAt ≤ now ≤ endsAt`         |
| Ended     | `now > endsAt`                    |

Status is derived from timestamps — there is no separate status column. Season configuration (name, start, end) is managed by admins. See [seasons.md](seasons.md) for schema details.

## Map

The main screen renders a MapLibre GL map of Lithuania overlaid with the WAL grid. Each square is colored by the team that controls it, or neutral if uncontested or tied. See [map.md](map.md) for grid geometry and rendering details.

## Homepage

The homepage introduces WAL GO, shows live season/team context when available, shows a hero countdown when the next season is scheduled but not active yet, explains the gameplay loop, demonstrates Cabrillo log processing, answers common questions, and ends with a Discord invite that links to the community server.

### Public map preview

The hero shows a non-interactive map as a background behind the marketing copy. A `Žiūrėti žemėlapį` button (outline, always rendered server-side since the action needs no auth) swaps the hero for a full interactive map without requiring login. The primary button next to it is auth-aware: `Prisijungti` (sign-in) for signed-out visitors, `Atidaryti žemėlapį` (links to the full `/map` route) for signed-in visitors.

The hero uses a single `min-h-[85vh]` section with one persistent `MapView` mounted in an absolutely positioned layer. The map never remounts or moves between states, so revealing/hiding is instant and flicker-free. The map always loads the displayed season's data (active season first, then the most recently ended season), the same as `/map`. The section keeps the page below it (team standings, gameplay sections) scrollable on mobile.

Reveal/hide is a two-way CSS transition (no mount/unmount), so it animates in both directions:

- The gradient legibility overlay fades its opacity to `0` when revealed.
- The hero content (logo, heading, buttons) fades out and shifts up (`-translate-y-4`) and becomes `pointer-events-none`, letting map clicks pass through.
- The map layer toggles `pointer-events` and its native controls (hidden until revealed).
- The `Slėpti žemėlapį` button fades/slides in.

Clicking a WAL square shows the square statistics directly under the map using `SelectedSquareStatsBox` in its leaner `row` variant — the WAL code on the left and the three team scores laid out side by side, each with a thin progress bar. The default `panel` variant (stacked bars) is still used in the `/map` sidebar.

## Social Previews

The root route (`apps/web/src/routes/__root.tsx`) defines the global document metadata. It includes the Lithuanian page title and description, plus Open Graph tags for `https://walgo.lt`:

- `og:type`, `og:url`, `og:title`, `og:description`, `og:site_name`, and `og:locale`
- `og:image` points at `/web-app-manifest-512x512.png`, with width, height, and alt text metadata

## Teams

Three fixed teams per season: **yellow**, **green**, **red**. Team assignment is random (server-side spin) and cannot be changed within a season. A player who has already joined sees their assigned team immediately instead of the spin UI.

## Error and 404 pages

Unmatched routes render `NotFound` (`apps/web/src/components/not-found.tsx`) via `defaultNotFoundComponent` in `router.tsx`. It shows a Lithuanian message, a home link, and a Discord invite button so users know where to report issues.

Uncaught render errors render `ErrorPage` (`apps/web/src/components/error-page.tsx`) via `defaultErrorComponent`. It displays the error message (if any), a retry button (`reset()`), and the same Discord link.

The Discord URL (`https://discord.gg/RQfcQ29d44`) is hardcoded in both components.

## Related Docs

- [auth.md](auth.md) — authentication and session handling
- [seasons.md](seasons.md) — season schema, team assignment, API endpoints
- [map.md](map.md) — WAL grid geometry, MapLibre rendering
- [qso-logging.md](qso-logging.md) — Cabrillo import, QSO processing, log CRUD
- [scoring.md](scoring.md) — territory control rules, leaderboard
- [design.md](design.md) — color token roles and accessibility guidance
- [rules.md](rules.md) — public rules page (`/rules`)
