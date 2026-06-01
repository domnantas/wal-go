# Design Tokens

WAL GO separates brand/team colors from interactive UI colors.

## Color Roles

- `olive`, `rust`, and `golden` are brand and team colors. Use them for the logo, team markers, map overlays, chart segments, and small identity accents.
- `primary` is the main action color for buttons, links, focusable controls, and selected filters.
- `destructive` is reserved for dangerous actions and error states.
- Team labels should not rely on colored text alone. Prefer neutral readable text with a colored dot, border, badge background, or map pattern.

## Dark Mode

Brand colors are theme-adaptive CSS variables. This keeps utilities such as `text-olive`, `bg-rust`, and `bg-golden` legible in both light and dark mode.

Avoid white text on golden or light team colors. Use the matching foreground tokens:

- `text-golden-foreground`
- `text-olive-foreground`
- `text-rust-foreground`

## Map And Competition UI

Map ownership may use team colors, but should also use a non-color cue where practical, such as stronger outlines, selected states, labels, or future patterned fills.

## Shared Icons

App-specific icons that are reused in multiple web surfaces should live in `apps/web/src/components`. `DiscordIcon` is shared by the account menu and homepage Discord invite.
When a dropdown item uses a rendered link element with custom visible content, put that visible icon and text inside the rendered element so the menu item remains visible and accessible.

## Header Actions

Desktop public header actions show the theme toggle beside the sign-in button. On mobile, the public theme toggle lives inside the navigation dropdown as a `Tema` row so the header keeps a compact action area. Authenticated users manage the theme from the account dropdown on all breakpoints.

The app opts into iOS edge-to-edge layout with `viewport-fit=cover`. The sticky header uses `--safe-area-inset-top` as top padding so its background extends behind the notch / Dynamic Island while keeping the visible controls inside the normal `--header-height` row. Full-height routes that subtract the header from the viewport should use `--app-header-height`, which includes both the visual header row and the safe-area inset.

## Button Rendering

The shared `Button` component wraps Base UI's button primitive. When a `Button` uses `render` with a non-native button element, such as TanStack Router `Link` or an anchor tag, set `nativeButton={false}`. Keep the default native behavior for real button elements and for primitives that render an actual `Button`.
