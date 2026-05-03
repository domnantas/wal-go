# Map

The `/map` route renders the main game map for signed-in users.

## Tiles

The current base map uses MapLibre GL with the OpenFreeMap Fiord style:

```txt
https://tiles.openfreemap.org/styles/fiord
```

The route imports MapLibre CSS and initializes the map on the client in a React effect. This keeps browser-only MapLibre APIs out of server rendering.

## Local map styles

The web app keeps local OpenFreeMap-compatible style JSON files in `apps/web/src/assets/`:

- `walgo-style.json` is the light style.
- `walgo-dark-style.json` is the dark variant.

They are inspired by the Liberty OSM style. Both are using the app palette: dark background, olive primary land details, rust and golden road accents, bark earth tones, and cream labels

## WAL grid

The route overlays valid WAL squares as a generated GeoJSON source. The valid square ranges are ported from `domnantas/ham.guide`'s `WAL.vue` component. Each square is a 10-minute latitude/longitude polygon with:

- A line layer for square boundaries, colored from the active app theme's primary token.
- A symbol layer for WAL labels, using theme foreground and halo colors.
- A fill layer for square control, using team colors for clear leaders and gray for tied squares.

Map square control is scoped to the displayed season. While a season is active, the map uses the active season. When no season is active, it falls back to the most recently ended season so the final map state remains visible between seasons.

## Square selection

WAL squares are clickable on the map. Clicking a square stores the selected WAL code in the `/map` route state, outlines the selected square, and shows a square statistics panel in the right sidebar under the team-controlled squares panel.

The selected-square panel uses the same `scoring.squares` query as the map overlay. If a square has no score rows yet, each team is shown with zero points. Progress bars are normalized against the highest team score in the selected square, so the local team balance is visible even when totals are small.

## Season sidebar

The right sidebar starts with season timing. During an active season it shows progress through the season. After an active season ends in the current session, the same slot immediately switches to results for that season. On a fresh load with no active season, it shows a countdown when the next season starts within three days and keeps the most recently ended season results visible below it.

The controlled-square summary and selected-square statistics use the same displayed season as the map: active season first, then the most recently ended season. When a next-season countdown reaches zero, the route immediately treats that upcoming season as the displayed active season and refreshes season queries in the background.

## Authorization

The route is protected with TanStack Router `beforeLoad` using `context.session?.user`. This is a navigation guard only; any future map data APIs must still use server-side authorization through ORPC `protectedProcedure`.

## Initial viewport

The initial map viewport is centered on Lithuania:

- Center: `[23.88, 55.17]`
- Zoom: `6.5`
