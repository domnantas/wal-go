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
