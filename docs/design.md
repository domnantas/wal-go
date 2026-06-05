# Design Tokens

WAL GO separates brand/team colors from interactive UI colors.

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
