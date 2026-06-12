# Design Tokens

WAL GO separates brand/team colors from interactive UI colors.

## Typography

- `--font-sans` — Geist Variable: body text, UI controls.
- `--font-serif` — Fraunces Variable (with optical sizing + true italics): display headings, the homepage hero, QSL card callsign and signoff.
- `--font-mono` — IBM Plex Mono (400/600/700): callsigns, square codes, coordinates, log tables, eyebrows.

All three load via Fontsource imports in `globals.css`.

## Aesthetic direction

Earthy, calm, exploration — "expedition field journal". Motifs used across the homepage:

- **Paper grain** — a fixed full-viewport noise overlay (`body::after` in `globals.css`, `soft-light` blend, ~5% light / ~8% dark). Non-interactive (`pointer-events: none`), applies app-wide.
- **Radio rings** — `.radio-rings` utility (`globals.css`): concentric `repeating-radial-gradient` circles tinted from `--foreground`. Origin tunable via `--rings-x` / `--rings-y`; combine with a `mask-image` fade. Used behind the Discord/QSL section.
- **Mono accents / morse** — small `font-mono` uppercase captions (section eyebrows, step labels, footer morse `WAL GO`) add field-log texture. Mark purely decorative ones `aria-hidden`.

## Discord QSL card

The homepage Discord CTA (`apps/web/src/components/discord-qsl-card.tsx`) is styled as a physical QSL card: airmail striped frame (rust/olive `repeating-linear-gradient`), perforated Discord stamp, circular postmark + cancellation waves (inline SVG), `TO RADIO` line, QSO confirmation table, PSE/TNX checkboxes, and a `73!` signoff. The whole card is one external `<a>` to `DISCORD_INVITE_URL`; the "button" inside is a styled `<span>`.

QSL paper is physical, so its palette is fixed oklch values via local CSS vars (`--qsl-paper`, `--qsl-ink`, …) — it does **not** follow light/dark theme tokens. Stamp perforation uses the `.qsl-perforation` utility in `globals.css` (two-layer CSS mask: tiled transparent holes along the border ring, solid content box).

## Color roles

- `olive`, `rust`, `golden` — brand and team colors. Use for the logo, team markers, map overlays, chart segments, small identity accents.
- `primary` — main action color for buttons, links, focusable controls, selected filters.
- `destructive` — dangerous actions and error states.
- Team labels must not rely on colored text alone. Prefer neutral readable text with a colored dot, border, badge background, or map pattern.

## Dark mode

Brand colors are theme-adaptive CSS variables, so `text-olive`, `bg-rust`, `bg-golden` stay legible in both modes. Avoid white text on golden or light team colors — use the matching foreground tokens: `text-golden-foreground`, `text-olive-foreground`, `text-rust-foreground`.

## Map & competition UI

Map ownership may use team colors but should add a non-color cue where practical (stronger outlines, selected states, labels, future patterned fills).

## Shared icons

App-specific icons reused across web surfaces live in `apps/web/src/components`. `DiscordIcon` is shared by the account menu and homepage Discord invite. When a dropdown item uses a rendered link with custom visible content, put the visible icon and text inside the rendered element so the item stays visible and accessible.

## Header

A single `--header-height` sticky row with a blurred background (`bg-card/50 backdrop-blur-sm`) on the `<header>`. Full-height routes subtract it via `calc(100dvh - var(--header-height))`.

Header actions: desktop public header shows the theme toggle beside sign-in; on mobile the public theme toggle lives in the nav dropdown as a `Tema` row to keep the action area compact. Authenticated users manage the theme from the account dropdown on all breakpoints.

## Button rendering

The shared `Button` wraps Base UI's button primitive. When a `Button` uses `render` with a non-native element (TanStack Router `Link`, an anchor), set `nativeButton={false}`. Keep the default for real button elements and primitives that render an actual `Button`.
