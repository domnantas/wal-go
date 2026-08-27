# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Licensed Lithuanian amateur radio operators (LY prefix), plus foreign operators they work as DX contacts.

Two confirmed segments, both served, with different jobs:

- **Active contesters** — the seed base. Already run contests and keep logs in Cabrillo/ADIF. Their job is bulk-uploading a session's log after operating and checking where their team stands. They must never be slowed down by onboarding scaffolding built for newcomers.
- **Casual / lower-activity operators** — the growth bet and the reason the game exists. Licensed but rarely on air. Their job is understanding the rules well enough to make a first contact count, then logging a handful of QSOs by hand. Activation of this segment is the product's point.

Logged-out visitors are a third audience: prospective players evaluating whether to register, and existing players checking the map without signing in.

## Product Purpose

A seasonal territory game layered on real radio activity. Lithuania is divided into 394 WAL squares (10′ × 10′ lat/lon cells). Three teams — yellow, green, red — compete to control squares; a team controls a square by holding strictly more points there than either rival. Points come from real QSOs logged by team members.

The product exists to get Lithuanian operators on the air more often by giving ordinary contacts a persistent, visible, competitive consequence. Success is measured in activity: operators who log QSOs they would not otherwise have made, and a map that visibly changes over a season.

## Positioning

Contest scoring already exists; territory does not. WAL GO's mechanism is a **persistent, contested, geographic map** rather than a leaderboard of totals — a square is held, lost, and retaken over a season, and any operator can flip one. Two properties a neighboring product could not truthfully copy:

- **WAL squares are the native Lithuanian award grid**, not an invented game board. Playing the game is working toward a real award.
- **Confirmation is mutual and dynamic.** Points double for *both* stations when both sides log the matching QSO — the score rewards contacts that actually happened, verified by the other operator, and reverses when one side is deleted.

## Operating Context

- Operators log from a shack or portable/field setup, typically **after** an operating session, not during it. Bulk import is the dominant path for contesters; manual entry for casual players.
- Real inputs are **Cabrillo and ADIF files** exported from logging software (N1MM, Log4OM, etc.). ADIF export back out is also supported.
- Usage is bursty and seasonal: heavy around contest weekends and season boundaries, quiet between.
- Coordination and trash talk happen on **Discord**, which is a first-class part of the loop, not a footer link.
- The domain vocabulary is real and non-negotiable: QSO, callsign, band, mode (CW/SSB/FM/DIGI), Cabrillo, ADIF, QSL, DX, WAL square. Timestamps are UTC in logs; the per-day duplicate rule uses Lithuanian calendar days (Europe/Vilnius).

## Capabilities and Constraints

Confirmed functionality:

- Email/password registration; a callsign on the profile is required before joining a season.
- Joining an active season triggers a **server-side random team spin** — yellow, green, or red, permanent for that season.
- QSO logging via Cabrillo/ADIF drop or manual entry on `/log`; ADIF export.
- Live map (`/map`) of Lithuania with squares colored by controlling team, square-detail stats, and an activity feed.
- Team and individual leaderboards, public rules page, admin tooling for seasons and moderation.
- Discord announcements and role sync; newsletter; PostHog analytics.

Durable constraints (documented in `docs/`, treat as product truth):

- **Lithuanian-only UI.** All user-facing copy is Lithuanian; no i18n layer is planned. Documentation and code stay English.
- **Season-scoped, zero carry-over.** Every data surface is read through a "currently displayed season" (active first, else most recently ended). Nothing persists across seasons. Season status is derived from timestamps — there is no status column.
- **Anonymized when logged out.** Public views never expose the callsign→team mapping: team, square, and time only. Signed-in users see full rosters, individual standings, and callsigns in square activity.
- **Refereed competition.** Admins may void QSOs and suspend or delete accounts for fabricated QSOs, multi-accounting, or rule circumvention; decisions are final (rule 2.3). The product must read as officiated, not as a toy.
- **Team identity must not rely on color alone.** Three teams are distinguished by color, so every team signal needs a second cue — dot, border, badge, label, or pattern.
- **Contact WAL square is mandatory** on every QSO; foreign contacts use the literal `DX`, which scores but never confirms.

## Stack

Existing codebase: TanStack Start + Router, oRPC, Drizzle + PostgreSQL, Better Auth, Tailwind + shadcn/ui in `packages/ui`, deployed to Cloudflare Workers via Alchemy with PlanetScale.

## Brand Commitments

- **Name and logo are fixed.** "WAL GO" and `apps/web/public/logo_512.png` are locked. The surrounding visual world is open to change.
- Ham-radio artifacts used as motifs (QSL cards, Cabrillo, morse, band plans, grid references) must stay **factually correct** — the audience is licensed operators who will catch fakery immediately.
- Voice is Lithuanian, plain, and operator-to-operator. Not corporate, not gamified-cute.

## Evidence on Hand

- Live production site at `https://walgo.lt`.
- Real game data: seasons, 394 real WAL squares, real QSOs, real teams.
- Brand assets in `apps/web/public/` — `logo_512.png`, `og.png`, favicons, web app manifest.
- Existing feature documentation in `docs/` (overview, rules, scoring, map, qso-logging, seasons, auth, leaderboard, activity-feed, admin, infra, db, and more) — the authority for product behavior.
- An active Discord community (`DISCORD_INVITE_URL`).

Not on hand and **must not be fabricated**: player counts, testimonials, press coverage, endorsements from LRMD or any radio body, or any figure about activity or growth.

## Product Principles

1. **Real radio first.** Every game mechanic maps to something that actually happened on the air. Never invent a score, a contact, or a confirmation.
2. **Two speeds, one product.** A contester must be able to drop a log file and leave; a newcomer must be able to understand the rules and log one QSO by hand. Neither path may tax the other.
3. **The map is the product.** Territory changing hands is the thing people come back to see. Liveness signals — activity feed, recent-contact pulse, countdowns — are core, not decoration.
4. **Officiated, not casual.** The rules are numbered, deep-linkable, and enforced. Surfaces should carry the credibility of a sanctioned competition.
5. **Public surfaces stay anonymous.** Competitive information is a signed-in privilege; the logged-out experience is a shop window, not a leak.

## Accessibility & Inclusion

No formal standard has been established for this project. One product-specific requirement is confirmed: **team identity must never be conveyed by color alone** — three-team color coding runs through the map, leaderboard, charts, and activity feed, and every instance needs a non-color cue.
