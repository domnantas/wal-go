# QSO Logging

The `/log` page has two responsibilities: Cabrillo file import and QSO log review/management.

Both write entry points on `/log` are gated by season state. The Cabrillo dropzone
and manual QSO button are shown only when there is an active season and the
signed-in user has joined it. If a season is active but the user has not joined,
the page shows a join-season prompt instead of upload controls. If no season is
active yet, upload controls remain hidden; when a future season is scheduled,
the page shows a live countdown to that season's `starts_at`.

## Manual Entry

Signed-in users can add QSOs manually from `/log` after joining the active season.

Manual entry captures:

| Field | Required | Notes |
| --- | --- | --- |
| Contact callsign | Yes | Normalized to base call before storage (see Callsign Normalization). |
| QSO date/time | Yes | Stored as a timezone-aware timestamp. |
| Band | Yes | Selected from the UI's supported band list. |
| Mode | Yes | Selected from the UI's supported mode list. |
| Operator WAL square | Yes | Explicit WAL code, e.g. `A05`. |
| Contact WAL square | No | Explicit WAL code when known. |

The backend validates that WAL square codes are valid Lithuanian WAL cells. Duplicate detection, scoring updates, and QSO deletion are implemented for manual entry.

### Geolocation square

The Add QSO dialog shows a geolocation toggle button next to the **Mano kvadratas**
label (`GeolocationSquareButton`, driven by `useGeolocationSquare`). When enabled,
the form derives the operator's WAL square from the device location via
`navigator.geolocation` and `calculateWal` from `@WAL-GO/grid`. If the resolved
coordinates fall outside any valid WAL cell, the field is left untouched.

Behaviour:

- **First click** triggers the browser permission prompt; while the request is
  pending the button shows a spinner.
- **Toggle state is persisted** in `localStorage`
  (`wal-go:geolocation-square-enabled`). The toggle is only treated as *active*
  when the stored flag is on **and** the browser permission is still `granted`.
  If the user later resets permission to "ask" (not the same as denying), the
  toggle reverts to off and the form will not silently re-prompt — the user must
  click again to re-grant.
- The square is **recalculated every time the dialog opens** (the form remounts),
  so an operator who moved between logs gets their current square rather than a
  stale one. With the toggle on and permission already granted, the field is
  pre-filled automatically on open.
- If the user **denies** permission, the button becomes disabled and shows the
  crossed-out locate icon; the toggle is also turned off.

Button states (lucide icons):

| State | Icon | Variant |
| --- | --- | --- |
| Off (default) | `Locate` | `outline` |
| On | `LocateFixed` | `default` (filled) |
| Locating | `Spinner` | — (disabled) |
| Denied / unsupported | `LocateOff` | disabled |

A tooltip (`Tooltip` from `@WAL-GO/ui`) explains the current action on hover. The
trigger wraps the button in a `span` so the tooltip still appears while the button
is disabled (denied/locating). The tooltip label mirrors the button state
("Nustatyti kvadratą pagal vietą" / "Nenaudoti mano vietos" / "Vietos prieiga
užblokuota").

The toggle is only rendered in `AddQsoDialog` (via the `geolocation` prop on
`QsoForm`); the edit dialog keeps manual square entry.

## Cabrillo Import

Users drop a `.log`, `.cbr`, or `.cabrillo` file onto the dropzone on `/log`. The file must be a valid Cabrillo v3 log for the `LY-WAL` contest.

### File Requirements

- `CALLSIGN:` header must be present and match the logged-in user's callsign (normalized — prefix/suffix stripped for comparison).
- `CONTEST:` header must equal `LY-WAL` (case-insensitive). Any other contest is rejected.
- File size limit: 2 MB.

### Accepted file extensions

`.log`, `.cbr`, `.cabrillo`

### QSO Line Format

Each `QSO:` line must follow the Cabrillo v3 exchange layout:

```
QSO: <freq> <mo> <date> <time> <mycall> <rst> <mysquare> <dxcall> <rst> <theirsquare>
```

| Field | Notes |
|---|---|
| `freq` | Frequency in kHz, or Cabrillo band designator (e.g. `144`, `1.2G`) |
| `mo` | Mode: `CW`, `PH`/`SSB`, `FM`, `RY`/`DG`/`DIGI` |
| `date` | `YYYY-MM-DD` |
| `time` | `HHMM` UTC |
| `mycall` | Operator callsign — must match file `CALLSIGN:` |
| `rst` | Signal report (ignored) |
| `mysquare` | Operator's WAL square, e.g. `A05` (format `[A-Z]\d{2}`) |
| `dxcall` | Contact callsign |
| `rst` | Contact signal report (ignored) |
| `theirsquare` | Contact's WAL square (optional; omitted or non-WAL format stored as null) |

### Parser (`packages/api/src/cabrillo/parser.ts`)

`parseCabrillo(content)` returns a `CabrilloParseResult`:

```ts
interface CabrilloParseResult {
  callsign: string | null;
  contest: string | null;
  qsos: CabrilloQso[];
  parseErrors: CabrilloParseError[];
}
```

Parse errors carry a `reason`: `invalidBand`, `invalidCallsign`, `invalidMode`, `invalidSquare`, or `malformedLine`.

### Skip Reasons (server-side)

After parsing, the server further filters QSOs. Each skipped QSO gets one of:

| Reason | Cause |
|---|---|
| `callsignMismatch` | `mycall` on QSO line differs from file callsign |
| `invalidDate` | Date/time cannot be parsed to a valid UTC timestamp |
| `outsideSeason` | QSO timestamp is before season start or after season end |
| `invalidSquare` | Operator square fails WAL validation |
| `exactDuplicate` | Identical QSO already in database for this user/season |
| `gameDuplicate` | Same call/band/mode/squares on same Lithuanian calendar day |

### Processing

Import runs synchronously in a single DB transaction (no background job). The endpoint returns immediately with:

```ts
{
  accepted: number;
  skipped: number;
  imported: ImportSuccess[];
  errors: ImportError[];
}
```

Each `ImportError` contains the line number, raw line content, and skip reason. The UI displays a summary and a collapsible error list.

Each `ImportSuccess` contains the source line number, raw line content, and stored QSO. After a successful import, the UI shows the imported QSOs in an expanded result table so users can confirm which contacts were accepted without relying only on the main log refresh.

## QSO Storage

Each accepted QSO is stored in the database linked to:
- The submitting user
- The active season at time of submission
- The operator WAL square that received points
- The optional contact WAL square, when provided

## Log View

The `/log` page lists all QSOs the user has submitted in the current season. Columns include callsign, band, mode, date/time, the credited operator WAL square, and the optional contact WAL square. Manual creation opens `AddQsoDialog`; each row opens a separate `EditQsoDialog` for edits or can delete the QSO while the season is still active. Both dialogs share the lower-level `QsoForm` field component so validation and date/square handling stay consistent without merging the add and edit workflows.

### Pagination

The log uses server-side pagination with a fixed page size of 20. Current page and band filter are stored as URL search params (`?page=N&band=X`), so they survive refresh and are bookmarkable. The `qsos.list` API endpoint accepts optional `page`, `band`, and `seasonId` inputs and returns `{ items, total, bands }` — where `bands` is the distinct list of bands the user has logged in the season (used to render filter chips). The `qsos.stats` endpoint is unaffected and still returns season-wide aggregates.

Band filtering is server-side: selecting a band resets to page 1. Previous/next pagination buttons appear below the table when there is more than one page.

The summary cards on `/log` are backed by server-side aggregates, not calculations over the currently loaded table rows. They show total QSOs, unique credited operator WAL squares, points from `user_season_score`, and unique contact callsigns for the active season.

### CRUD

| Operation | Supported | Notes                                              |
|-----------|-----------|----------------------------------------------------|
| Create    | Yes       | Via manual entry now; ADIF upload later           |
| Read      | Yes       | Paginated table on `/log`                          |
| Update    | Yes       | Edits the user's QSO while the season is active    |
| Delete    | Yes       | Removes the user's QSO from the active season      |

Editing runs the same WAL square, exact duplicate, game duplicate, and season-window validation as creating a QSO. The row remains linked to its original season and team. If the credited operator square changes, scoring is adjusted atomically by removing the old square point and adding the new square point. Other edits keep the point total unchanged.

Deleting a QSO that was the sole point giving a team control of its operator square immediately releases that square to the next-highest team (or to neutral if tied/empty).

## Callsign Normalization

Both operator and contact callsigns are reduced to their **base call** before
comparison and storage via `normalizeCallsign` (`packages/api/src/routers/qsos.ts`).
The callsign is uppercased, trimmed, split on `/`, and the longest part is kept —
this strips operating suffixes (`/P`, `/M`, `/MM`, `/QRP`) and country prefixes
(`9A/LY2EN`). The longest `/`-delimited part is the base call in practice.

Consequences:

- The operator's `mycall` is normalized only to **match** it against the logged-in
  user's callsign.
- The contact's `dxcall` is normalized and **stored** as the base call, so a
  station's suffix variants collapse to one identity. Location is not lost: the
  WAL **square** field carries it. Working `LY2EN` from `A05` and `LY2EN/P` from
  `A06` remains two distinct, scoring QSOs because the contact squares differ;
  `LY2EN` and `LY2EN/P` from the **same** square on the same day collapse to one.

> Historical QSO rows inserted before this change keep their raw suffix and are
> not back-filled.

## Rate Limits

All write endpoints are rate-limited per authenticated user using the shared `rate_limit` table.

| Endpoint | Max | Window |
| --- | --- | --- |
| `qsos.create` | 120 | 60s |
| `qsos.update` | 120 | 60s |
| `qsos.delete` | 120 | 60s |
| `qsos.bulkCreate` | 20 | 1 hour |
| `qsos.importCabrillo` | 10 | 1 hour |

Exceeding a limit returns a `TOO_MANY_REQUESTS` error with the message "Per daug užklausų. Bandykite vėliau."

## User Callsign Requirement

A callsign is required on the user profile before logging QSOs. The callsign is used to validate that the `STATION_CALLSIGN` field in the ADIF matches the logged-in operator (exact validation rules TBD during implementation).
