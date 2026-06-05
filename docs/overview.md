# WAL GO — Game Overview

Web-based territory competition for Lithuanian amateur radio operators, inspired by Pokémon GO and Ingress. Operators compete in seasons to control WAL grid squares by logging real radio contacts (QSOs).

## Core Concept

Lithuania is divided into a grid of WAL squares (10′ × 10′ lat/lon cells). Three teams compete to hold as many squares as possible within a season. A team holds a square when it has strictly more points there than either rival. Points come from QSOs logged by team members.

## Player Lifecycle

1. **Register** — email/password account ([auth.md](auth.md)).
2. **Add callsign** — required before joining a season; stored on the user profile.
3. **Join a season** — while a season is active ([seasons.md](seasons.md)).
4. **Spin the wheel** — server assigns yellow/green/red at random; permanent for that season.
5. **Log QSOs** — drop a Cabrillo/ADIF file or add QSOs manually on `/log`; each valid QSO awards points ([qso-logging.md](qso-logging.md)).
6. **Watch the map** — `/map` shows Lithuania with squares colored by controlling team ([map.md](map.md)).

## Season Lifecycle

Status is derived from timestamps — no status column:

| Status | Condition |
|---|---|
| Upcoming | `now < startsAt` |
| Active | `startsAt ≤ now ≤ endsAt` |
| Ended | `now > endsAt` |

Season config (name, start, end) is managed by admins. See [seasons.md](seasons.md).

## Teams

Three fixed teams per season: **yellow**, **green**, **red**. Assignment is random (server-side spin), immutable within a season. A player who already joined sees their team instead of the spin UI.

## Homepage

Introduces WAL GO, shows live season/team context when available, a hero countdown when the next season is scheduled, the gameplay loop, a Cabrillo demo, FAQ, and a Discord invite.

### Public map preview

The hero shows a non-interactive map behind the marketing copy. A `Žiūrėti žemėlapį` button (outline, server-rendered, no auth needed) swaps the hero for a full interactive map without login. The primary button beside it is auth-aware: `Prisijungti` for signed-out, `Atidaryti žemėlapį` (→ `/map`) for signed-in.

One persistent `MapView` is mounted in an absolutely positioned layer inside a single `min-h-[85vh]` section — it never remounts or moves, so reveal/hide is instant and flicker-free, driven by a two-way CSS transition:

- The gradient legibility overlay fades to opacity `0` when revealed.
- Hero content fades out, shifts up (`-translate-y-4`), and becomes `pointer-events-none` so map clicks pass through.
- The map layer toggles `pointer-events` and its native controls (hidden until revealed).
- The `Slėpti žemėlapį` button fades/slides in.

The map loads the displayed season (active first, else most recently ended), same as `/map`. Clicking a square shows stats below the map via `SelectedSquareStatsBox` in its `row` variant (WAL code + three side-by-side team bars). The `panel` variant (stacked bars) is used in the `/map` sidebar.

## Social Previews

The root route (`apps/web/src/routes/__root.tsx`) defines global document metadata: Lithuanian title/description plus Open Graph tags for `https://walgo.lt` (`og:type`, `og:url`, `og:title`, `og:description`, `og:site_name`, `og:locale`). `og:image` → `/web-app-manifest-512x512.png` with width/height/alt.

## Error and 404 pages

Unmatched routes render `NotFound` (`components/not-found.tsx`) via `defaultNotFoundComponent` in `router.tsx`: Lithuanian message, home link, Discord button. Uncaught render errors render `ErrorPage` (`components/error-page.tsx`) via `defaultErrorComponent`: error message, retry (`reset()`), Discord link. The Discord URL (`https://discord.gg/RQfcQ29d44`) is hardcoded in both.

## Related Docs

- [auth.md](auth.md), [seasons.md](seasons.md), [map.md](map.md), [qso-logging.md](qso-logging.md), [scoring.md](scoring.md), [design.md](design.md), [rules.md](rules.md), [admin.md](admin.md), [infra.md](infra.md), [db.md](db.md), [discord-announcements.md](discord-announcements.md), [posthog-analytics.md](posthog-analytics.md)
