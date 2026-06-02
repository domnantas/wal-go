# Map

The `/map` route renders the main game map for signed-in users.

## Tiles

The current base map uses MapLibre GL with the OpenFreeMap Fiord style:

```txt
https://tiles.openfreemap.org/styles/fiord
```

The route imports MapLibre CSS and initializes the map on the client in a React effect. This keeps browser-only MapLibre APIs out of server rendering.

The map uses MapLibre's native controls for map navigation, scale, and geolocation. The geolocation button asks for browser location permission, then shows the user's current location with high accuracy, the accuracy circle, and user-location tracking enabled.

Geolocation is gated behind the `enableGeolocation` prop on `MapView` (default `false`). Only `/map` passes `enableGeolocation`; when it is off the `GeolocateControl`, its auto-trigger, and the current-square box are not added at all. The homepage embeds `MapView` without the prop, so it renders no geolocation control and never prompts for location.

### Persisted geolocation opt-in

When the user successfully geolocates on the map (the `GeolocateControl` `geolocate` event fires), the opt-in is persisted to `localStorage` under `wal-go:map-geolocation-enabled`. On the next `/map` load, if that flag is set **and** the browser still reports geolocation permission as `granted` (checked via the Permissions API without prompting), the map auto-triggers geolocation on the `load` event so it opens centered on (and zoomed to) the operator. A `PERMISSION_DENIED` error clears the flag. A revoked/reset permission is never silently re-prompted — the user must click the button again. De-selecting the geolocate button (turning tracking fully off) also clears the persisted flag and the current-square box. This is detected on `trackuserlocationend` by checking the control's `_watchState` is `OFF`, since that event also fires on pan (state `BACKGROUND`), where the box must stay.

This flag is **separate** from the add-QSO geolocation opt-in (`wal-go:geolocation-square-enabled`, see `qso-logging.md`). Allowing location on the map does not opt the operator into QSO auto-location, and vice versa. Auto-location only runs on `/map` (where `enableGeolocation` is set), not on the homepage.

### Control theming

MapLibre's default controls don't follow the app's light/dark theme: the button chrome is hardcoded light, and the icons ship as inline SVG `background-image` data URIs with a fixed fill, so they can't inherit color. We theme them in `apps/web/src/domains/map/maplibre-theme.css` (imported by `map-view.tsx` right after MapLibre's own CSS) without the `filter: invert()` hack:

- **Chrome** (`.maplibregl-ctrl-group`, scale, attribution, popups) is restyled with theme tokens (`--card`, `--border`, `--foreground`, `--muted`).
- **Icons** are moved from `background-image` to `mask-image`, and painted with `background-color: var(--foreground)`. The mask only uses the SVG's alpha shape, so the data URI's original fill is irrelevant and a single token drives both themes. The SVG geometry is copied verbatim from `maplibre-gl/dist/maplibre-gl.css`.
- **State colors**: the geolocate icon is tinted `--accent` while tracking/background, `--destructive` on error, and `--muted-foreground` when disabled. The `geolocate-background` state uses a dot-less mask variant, matching upstream.

Selectors are scoped under `.maplibregl-map` to outrank the library's own rules regardless of stylesheet load order. The shared icon rule additionally uses a `button[class]` attribute selector to push `background-image: none` above MapLibre's per-icon rules — without it the default dark SVG bleeds through the mask. (MapLibre's own white-icon variant only applies via `@media (prefers-color-scheme: dark)`, which does not match the app's class-based `.dark` mode.)

When MapLibre is upgraded, re-check the icon data URIs in its CSS in case the SVG paths changed.

### Current square indicator

While geolocation tracking is active, the map listens to the `GeolocateControl` `geolocate` event and computes the user's WAL square from the reported coordinates via `@WAL-GO/grid`'s `calculateWal`. The current square is shown in a small overlay box (labeled "Jūsų kvadratas") pinned to the top-right of the map, beside the zoom/geolocation controls. Because tracking emits a `geolocate` event on every position update, the box updates automatically as the operator moves from square to square. Only valid WAL squares are shown. The box stays put when the user pans the map — it is not cleared when MapLibre fires `trackuserlocationend` for moving out of active lock (state `BACKGROUND`). It is cleared on a geolocation `error`, and on a true de-select (`trackuserlocationend` with `_watchState` `OFF`), which also clears the persisted geolocation opt-in.

## Local map styles

The web app keeps local OpenFreeMap-compatible style JSON files in `apps/web/src/assets/`:

- `walgo-style.json` is the light style.
- `walgo-dark-style.json` is the dark variant.

They are inspired by the Liberty OSM style. Both are using the app palette: dark background, olive primary land details, rust and golden road accents, bark earth tones, and cream labels

## WAL grid

The route overlays valid WAL squares as a generated GeoJSON source. The valid square ranges are ported from `domnantas/ham.guide`'s `WAL.vue` component. Each square is a 10-minute latitude/longitude polygon with:

- A line layer for square boundaries, colored from the active app theme's primary token.
- A symbol layer for WAL labels, using theme foreground and halo colors. `text-size` interpolates linearly across zoom (stops at zoom 5/7/10) — the low stop is required because `interpolate` clamps below its range, which previously left labels at a fixed 12px when zoomed out. `text-allow-overlap` is `false` so MapLibre thins out colliding labels at low zoom (where, with the dynamic fit, mobile sits below zoom 7 and squares are only a few pixels wide); at high zoom there are no collisions so all labels still show.
- A fill layer for square control, using team colors for clear leaders and gray for tied squares.

Map square control is scoped to the displayed season. While a season is active, the map uses the active season. When no season is active, it falls back to the most recently ended season so the final map state remains visible between seasons.

## Square selection

WAL squares are clickable on the map. Clicking a square stores the selected WAL code in the `/map` route state, outlines the selected square, and shows a square statistics panel in the right sidebar under the team-controlled squares panel.

The selected-square panel uses the same `scoring.squares` query as the map overlay. If a square has no score rows yet, each team is shown with zero points. Progress bars are normalized against the highest team score in the selected square, so the local team balance is visible even when totals are small.

On `/map`, selecting a square also scrolls its statistics panel into view (`scrollIntoView` with `behavior: "smooth"`, `block: "nearest"`), so the panel is visible without manual scrolling — in the sidebar on desktop and below the map on mobile. This is driven by an effect on the selected code in the route, scoped to `/map` only; the homepage map does not scroll.

## Season sidebar

The right sidebar starts with season timing. During an active season it shows progress through the season. After an active season ends in the current session, the same slot immediately switches to results for that season. On a fresh load with no active season, it shows a countdown when the next season starts within three days and keeps the most recently ended season results visible below it.

The controlled-square summary and selected-square statistics use the same displayed season as the map: active season first, then the most recently ended season. When a next-season countdown reaches zero, the route immediately treats that upcoming season as the displayed active season and refreshes season queries in the background.

## Discord community box

The bottom of the right sidebar shows a dismissable Discord invite (`DiscordCommunityBox`). It links to `DISCORD_INVITE_URL` and is hidden once the user clicks the close button. Dismissal is persisted in `localStorage` under the `discord-community-box-dismissed` key.

To stay SSR-safe, the box starts hidden and reads `localStorage` in a mount effect, so the server render never assumes a visibility state.

## Authorization

The route is protected with TanStack Router `beforeLoad` using `context.session?.user`. This is a navigation guard only; any future map data APIs must still use server-side authorization through ORPC `protectedProcedure`.

## Initial viewport

The initial viewport is computed at runtime rather than hardcoded. On load, `fitLithuaniaBounds` calls `map.cameraForBounds(LITHUANIA_BOUNDS, { padding })` to frame the whole country in the current container, then `jumpTo`s that camera. The same fitted zoom is locked in as `minZoom` via `map.setMinZoom`, so the user can never zoom out past the full-country view.

This replaces the previous fixed `zoom`/`minZoom` values, which left Lithuania cropped on narrow mobile viewports. Because the fit is derived from the container size, it adapts to any viewport without per-breakpoint branching. A `resize` listener re-runs the fit (minZoom only, without re-centering) so rotation/resize keeps the constraint correct while preserving the user's current pan and zoom.

- Center seed: `[23.88, 55.17]` (replaced by the fitted camera on load)
- Fit bounds: `LITHUANIA_BOUNDS` = `[[20.9, 53.89], [26.87, 56.45]]`
- Pan limit: `maxBounds` = `[[19, 52.896667], [29, 57.450278]]`
