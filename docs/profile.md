# Operator profile

`/profile/$callsign` (`apps/web/src/routes/profile.$callsign.tsx`) shows one operator's
record: identity, territory, career and season counters, band/mode split, earned
achievements, and their most recent contacts.

The full achievement catalogue — including locked entries with progress — lives on a separate
personal page, `/achievements` ([achievements.md](achievements.md)).

## Visibility

**Signed-in only.** The route guards in `beforeLoad` with the same `getUser` +
redirect-to-sign-in pattern as `/map`, `/leaderboard`, and `/join-season`. This matches the
player-visibility rule in [overview.md](overview.md): callsign-level detail is a signed-in
privilege, never exposed to logged-out visitors.

Banned operators have no profile — `resolveOperator` filters on `banned = false` and throws
`NOT_FOUND`, so a banned callsign renders the "Operatorius nerastas" empty state. This
matches their exclusion from every standing and aggregate.

Callsign lookup is case-insensitive (`upper(user.name)`), so `/profile/ly1ja` and
`/profile/LY1JA` resolve to the same operator.

## Entry points

- **Account dropdown** — `Mano profilis` (`UserRound`) and `Pasiekimai` (`Stamp`), above
  `Nustatymai`.
- **Leaderboard** — every callsign in the individual standings table links to its profile.
- **Profile** — the achievements heading links to `/achievements`, but only on your own
  profile.

## Layout

An unboxed masthead over full-width sections that otherwise use the app's normal card
language — the profile should not read as a different product from `/log` and `/leaderboard`:

```
  avatar  CALLSIGN                      ← no box, graticule backdrop
          ● team · season · nuo date

  Teritorija                    47/210
  ┌──────────────────────────────────┐  ← full-width map card
  │ coverage bar · map · legend      │
  └──────────────────────────────────┘
  [card][card][card][card][card]        ← log stat cards
  [ Juostos card ] [ Rūšys card ]
  Pasiekimai                     12/34
  [ stamps, on the page ground ]
  Paskutiniai ryšiai
  ┌──────────────────────────────────┐
  │ table                            │
  └──────────────────────────────────┘
```

Sections sit `gap-8` apart under a plain `mb-3 font-bold font-serif text-xl` h2 — the same
rhythm and heading style as `/leaderboard`, with no bespoke hairline rules.

**Only the header and the achievement stamps are unboxed.** The header because the operator's
identity is the page masthead, and the stamps because they are paper artifacts — a card around
a perforated stamp fights the metaphor.

### Header (`domains/profile/profile-header.tsx`)

Sits on the page ground, not in a card — the operator's identity is the masthead. Padded on
the left (`pl-6 sm:pl-8`) so the avatar is inset from the page edge. Avatar (`user.image`, falling back to
the first two characters of the callsign in mono), callsign at `text-4xl`/`text-5xl` mono, then
one line carrying team (colored dot + label, never color alone), current season name, and the
member-since date.

A `graticule` panel sits behind the content, radially masked so it fades out to the right.
A team-colored wash was tried here and removed — the team already reads from the dot in the
meta line, and tinting the masthead only muddied the graticule.

**Avatar upload is not enabled.** `user.image` exists in the auth schema and better-auth-ui
ships an avatar uploader, but `AuthProvider` is not passed an `avatar` prop, so nothing
currently writes the column. The profile renders whatever is there and falls back cleanly.
Enabling upload needs a storage backend and is not part of this feature.

### Map (`domains/profile/profile-map.tsx`)

The operator's footprint rather than the game's territory state. Full width, in a `rounded-4xl` card: a coverage bar across the top edge, the map itself, then
the legend in a bordered footer strip. The heading row above carries
`worked / TOTAL_SQUARES` and a percentage. Squares stay clickable; the selected code shows in the legend row. With no
squares worked, the map is replaced by a prompt to log a first QSO.

**`MapView`'s root element is `flex-1`, so its container must be a flex box** — a non-flex
parent collapses the map to zero height and it renders blank.

### Stats (`domains/profile/profile-stats.tsx`)

Five cards in the established log stat card language (mono label + faded icon, serif tabular
number — see [design.md](design.md)): points, QSO count, confirmed count, distinct callsigns,
and longest streak. Every card shows the **career** figure as its number and the current
season's figure on the secondary line, so the five read on one scale.

### Distribution (`domains/profile/profile-distribution.tsx`)

Two mono-eyebrow cards (the map sidebar box language) holding career band and mode splits as
horizontal bars, normalized against the busiest entry. Bands and modes with no QSOs are
omitted rather than shown at zero.

### Achievements (`domains/profile/profile-achievements.tsx`)

**Earned achievements only**, newest first, rendered as postage stamps
(`domains/profile/achievement-stamp.tsx`). Locked ones live on `/achievements`
([achievements.md](achievements.md)); the profile links there only when you are looking at
your own profile, since that page is personal. A header counts earned against the catalogue
total.

With nothing earned, the section shows a short explanation instead of an empty grid — plus,
on your own profile, a link to the full catalogue so a new operator can see what is reachable.

Stamps use the content-sized `.stamp-perforation` utility (`globals.css`): a
perforated olive edge, an icon in olive ink, a mono label, and a circular postmark carrying
the unlock date. Each stamp is tilted by index (`-rotate-2` … `rotate-2`) and straightens on
hover, the same paper-artifact language as the homepage QSO demo card ([design.md](design.md)).

### Recent QSOs (`domains/profile/profile-recent-qsos.tsx`)

The last 10 contacts: callsign, band, mode, operator square (with the contact square when
present), Vilnius-formatted timestamp, and the per-QSO score with the confirmed checkmark —
the same score presentation as `/log` ([scoring.md](scoring.md)).

## Map overlay

`MapView` gained an `overlay` prop (`apps/web/src/domains/map/map-view.tsx`):

```ts
type MapOverlay =
  | { kind: "control" }
  | { kind: "worked"; allTimeSquares: string[]; seasonSquares: string[]; team: Team | null };
```

`control` is the default and the existing behavior — squares tinted by the team holding them.
`worked` paints one operator's footprint instead:

- Every square worked career-wide takes a muted gray tint at reduced opacity
  (`theme.workedFillColor`, `fill-opacity` 0.28).
- Squares worked in the **current season** take the operator's team color at full strength
  (`fill-opacity` 0.4) **and** a 2px outline in the same color
  (`wal-grid-worked-line`, filtered on the `seasonWorked` feature property). The outline is
  the required non-color cue — team identity never rests on hue alone
  ([design.md](design.md)).

Both overlays write the same `controllingTeam` property, so one `match` expression paints
both; the `worked` value is simply an extra arm. The worked overlay also **disables** the
`scoring.squares`, `scoring.recentSquares`, and `scoring.recentContactLines` queries — none of
that live game data is read on a profile, so the requests are never made.

Repainting runs through one `paintSquares` callback shared by the style-load handler, the map
load handler, and the data effect, because the worked overlay has no `squaresData` to key off.

## Data

All five procedures are `protectedProcedure`s in `packages/api/src/routers/profile.ts`, each
taking `{ callsign }`:

The page waits for all five datasets before rendering. If a secondary request fails, it shows
the shared error page instead of substituting empty arrays that would make a populated profile
look empty; retrying refetches all four secondary profile datasets. `/achievements` uses the
same explicit error state for its catalogue request.

| Procedure | Returns |
|---|---|
| `profile.get` | Identity, current-season membership, seasons played, career and current-season counter rows |
| `profile.squares` | `{ allTime, season }` — worked square codes |
| `profile.distribution` | Career band and mode counts |
| `profile.achievements` | The full catalogue with per-operator progress and unlock dates |
| `profile.recentQsos` | The last 10 QSOs |

Counters come from the materialized `user_stat` table ([achievements.md](achievements.md)).
**Worked squares are read straight from `qso`**, the source of truth — the
`(user_id, season_id, qso_at)` index covers the scan and a whole career dedupes to at most
`TOTAL_SQUARES` codes, so there is nothing there worth materializing. The rule is: materialize
what the write path needs (achievement evaluation runs on every QSO write), query what the
read path needs.

## Related Docs

- [achievements.md](achievements.md), [leaderboard.md](leaderboard.md),
  [map.md](map.md), [scoring.md](scoring.md), [design.md](design.md),
  [overview.md](overview.md)
