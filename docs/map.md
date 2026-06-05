# Map

The `/map` route renders the main game map for signed-in users.

## Tiles

Base map is MapLibre GL. Local OpenFreeMap-compatible style JSON lives in `apps/web/src/assets/`: `walgo-style.json` (light) and `walgo-dark-style.json` (dark), inspired by the Liberty OSM style and using the app palette (dark background, olive land, rust/golden road accents, bark earth tones, cream labels).

The map is initialized on the client in a React effect to keep browser-only MapLibre APIs out of SSR. It uses MapLibre's native navigation, scale, and geolocation controls.

## Geolocation

Gated behind the `enableGeolocation` prop on `MapView` (default `false`). Only `/map` passes it; the homepage embeds `MapView` without it, so it renders no geolocation control and never prompts. When off, the `GeolocateControl`, its auto-trigger, and the current-square box are not added at all. The geolocation button requests high-accuracy location and enables the accuracy circle and tracking.

### Persisted opt-in

On a successful `geolocate` event the opt-in is persisted to `localStorage` under `wal-go:map-geolocation-enabled`. On the next `/map` load, if that flag is set **and** the browser still reports geolocation permission as `granted` (checked via the Permissions API without prompting), the map auto-triggers geolocation on `load`, opening centered on the operator. A `PERMISSION_DENIED` error clears the flag. A revoked/reset permission is never silently re-prompted. De-selecting the geolocate button also clears the flag and the current-square box — detected on `trackuserlocationend` when the control's `_watchState` is `OFF` (pan fires the same event with state `BACKGROUND`, where the box must stay).

This flag is **separate** from the add-QSO opt-in (`wal-go:geolocation-square-enabled`, see [qso-logging.md](qso-logging.md)). Allowing map location does not opt into QSO auto-location, or vice versa.

### Current square indicator

While tracking, the map listens to `geolocate` and computes the user's WAL square via `@WAL-GO/grid`'s `calculateWal`. It's shown in a small overlay box ("Jūsų kvadratas") pinned top-right beside the controls, updating on every position event. Only valid squares show. The box survives pan; it's cleared on a geolocation `error` and on a true de-select (`trackuserlocationend` with `_watchState` `OFF`).

### Control theming

MapLibre's default controls ignore the app's light/dark theme (hardcoded light chrome; icons ship as inline SVG `background-image` data URIs with a fixed fill). Themed in `apps/web/src/domains/map/maplibre-theme.css` (imported by `map-view.tsx` right after MapLibre's CSS), without the `filter: invert()` hack:

- **Chrome** (`.maplibregl-ctrl-group`, scale, attribution, popups) restyled with theme tokens (`--card`, `--border`, `--foreground`, `--muted`).
- **Icons** moved from `background-image` to `mask-image`, painted with `background-color: var(--foreground)` — the mask uses only the SVG's alpha shape, so a single token drives both themes. SVG geometry copied verbatim from `maplibre-gl/dist/maplibre-gl.css`.
- **State colors**: geolocate icon tinted `--accent` while tracking/background, `--destructive` on error, `--muted-foreground` when disabled. The `geolocate-background` state uses a dot-less mask variant (matches upstream).

Selectors are scoped under `.maplibregl-map` to outrank the library regardless of load order. The shared icon rule also uses a `button[class]` attribute selector to push `background-image: none` above MapLibre's per-icon rules, else the default dark SVG bleeds through the mask. (MapLibre's white-icon variant only applies via `@media (prefers-color-scheme: dark)`, which doesn't match the class-based `.dark` mode.)

**On MapLibre upgrade, re-check the icon data URIs in its CSS in case the SVG paths changed.**

## WAL grid

Valid WAL squares overlay as a generated GeoJSON source. Valid ranges ported from `domnantas/ham.guide`'s `WAL.vue`. Each square is a 10-minute lat/lon polygon with:

- **Line layer** for boundaries, colored from the theme's primary token.
- **Symbol layer** for labels (theme foreground + halo). `text-size` interpolates linearly across zoom (stops 5/7/10) — the low stop is required because `interpolate` clamps below its range. `text-allow-overlap` is `false` so MapLibre thins colliding labels at low zoom (mobile sits below zoom 7 with the dynamic fit); no collisions at high zoom so all labels show.
- **Fill layer** for control, using team colors for clear leaders and gray for tied squares.
- **Pulse line layer** (`wal-grid-pulse-line`) for recent activity, filtered to features with `recentActivity === true`. Drawn under the selected-square outline.

Square control is scoped to the displayed season: active season while one is active, else the most recently ended season (so the final map state stays visible between seasons).

## Recent-activity pulse

Squares with a radio contact in the last 2 hours pulse to signal live activity. The set of codes comes from `scoring.recentSquares` (keyed on `qsoAt`, banned users excluded — see [activity-feed.md](activity-feed.md)), polled every 60s. `createEnrichedGeoJSON` writes a `recentActivity` boolean onto each feature alongside `controllingTeam`, and the pulse line layer filters on it.

MapLibre can't animate paint via CSS, so a `requestAnimationFrame` loop oscillates the layer's `line-opacity` (0.3 → 0.95) on a `(1 − cos)/2` breathing curve (~1.5s period); `line-width` stays fixed. The loop reads `mapRef` each frame (the map is created in a later effect, so capturing it once at mount would see `null` and never start), and is cancelled on unmount.

### Battery cost

Each `setPaintProperty` forces a full GL canvas repaint, so a naive always-on 60fps loop drains mobile batteries. Mitigations:

- **Gated** — the loop only runs when at least one square is pulsing (`hasRecentSquares`); the effect depends on it, so with no recent activity there is zero ongoing cost. The layer's filter hides it entirely anyway.
- **`prefers-reduced-motion`** — the loop is skipped; the layer keeps its static `0.8` opacity, which also covers the brief window before the loop starts. (Background tabs are already free — browsers throttle `requestAnimationFrame` there.)

The loop runs at the display's native frame rate while squares are pulsing and the tab is foreground.

## Square selection

Squares are clickable. Clicking stores the selected WAL code in `/map` route state, outlines the square, and shows a stats panel in the right sidebar under the team-controlled panel. The panel uses the same `scoring.squares` query as the overlay; a square with no rows shows all teams at zero. Progress bars are normalized against the highest team score in the square.

On `/map`, selecting a square scrolls its stats panel into view (`scrollIntoView`, `behavior: "smooth"`, `block: "nearest"`) — driven by an effect on the selected code, scoped to `/map` only; the homepage map does not scroll.

## Season sidebar

Starts with season timing. Active season → progress through the season. When an active season ends in-session, the slot switches to that season's results. On a fresh load with no active season → countdown if the next season starts within three days, plus the most recently ended results below.

The controlled-square summary and selected-square stats use the same displayed season as the map. When a next-season countdown reaches zero, the route treats that upcoming season as active and refreshes season queries in the background.

## Discord community box

Bottom of the right sidebar: a dismissable Discord invite (`DiscordCommunityBox`) linking to `DISCORD_INVITE_URL`, hidden once closed. Dismissal persisted in `localStorage` under `discord-community-box-dismissed`. To stay SSR-safe it starts hidden and reads `localStorage` in a mount effect.

## Authorization

Protected with TanStack Router `beforeLoad` using `context.session?.user` — a navigation guard only. Map data APIs must still authorize server-side via ORPC `protectedProcedure`.

## Initial viewport

Computed at runtime, not hardcoded. On load `fitLithuaniaBounds` calls `map.cameraForBounds(LITHUANIA_BOUNDS, { padding })` to frame the whole country in the current container, then `jumpTo`s. The fitted zoom is locked as `minZoom` via `setMinZoom`, so the user can't zoom out past the full-country view. A `resize` listener re-runs the fit (minZoom only, no re-center) so rotation/resize keeps the constraint while preserving pan/zoom. Derived from container size, it adapts to any viewport without per-breakpoint branching (the previous fixed values cropped Lithuania on narrow mobile).

- Center seed: `[23.88, 55.17]` (replaced by the fitted camera on load)
- Fit bounds: `LITHUANIA_BOUNDS` = `[[20.9, 53.89], [26.87, 56.45]]`
- Pan limit: `maxBounds` = `[[19, 52.896667], [29, 57.450278]]`
