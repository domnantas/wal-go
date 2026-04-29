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

- A line layer for square boundaries.
- A symbol layer for WAL labels.

## Authorization

The route is protected with TanStack Router `beforeLoad` using `context.session?.user`. This is a navigation guard only; any future map data APIs must still use server-side authorization through ORPC `protectedProcedure`.

## Initial viewport

The initial map viewport is centered on Lithuania:

- Center: `[23.88, 55.17]`
- Zoom: `6.5`
