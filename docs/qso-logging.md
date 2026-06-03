# QSO Logging

The `/log` page has two responsibilities: log file import (Cabrillo or ADIF) and
QSO log review/management.

Both write entry points on `/log` are gated by season state. The log dropzone
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
- **iOS Safari has no Permissions API for geolocation** (`navigator.permissions
  .query({ name: "geolocation" })` is unavailable), so the permission state can
  never resolve to `granted` there. To avoid the persisted toggle appearing
  permanently off on iOS, when the Permissions API is unsupported the toggle is
  treated as active based on the stored opt-in flag alone
  (`isPermissionsApiSupported()` in `useGeolocationSquare`).
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

## Log Import (Cabrillo & ADIF)

Importing is a **two-step** flow: the file is parsed and shown in an editable
review dialog, and nothing is stored until the user submits it.

1. The user drops a `.log`, `.cbr`, `.cabrillo`, `.adi`, or `.adif` file onto the
   dropzone on `/log`. The file is read as text **in the browser**.
2. `@WAL-GO/log-parse` parses it client-side (format auto-detected) into draft
   QSOs and they open in the **review dialog** (`log-review-dialog.tsx`).
3. The user edits squares row by row and submits. The `qsos.commitUpload`
   endpoint authoritatively re-validates, de-duplicates, inserts, scores, and
   records the upload.

File size limit: 2 MB.

### Format detection

`detectLogFormat(content)` returns `adif` when the content contains an ADIF
marker (`<eor>`, `<eoh>`, or `<call:`, case-insensitive), otherwise `cabrillo`.

### The `@WAL-GO/log-parse` package

A pure, dependency-free package shared by the web app and the API. It is
deliberately **lenient**: squares are returned **raw** (never dropped or nulled)
so the review dialog can let the user fix them. Each draft QSO is:

```ts
interface DraftQso {
  index: number;           // line number (Cabrillo) or record index (ADIF)
  raw: string;             // source line / record, used for the upload audit
  contactCallsign: string;
  band: string | null;
  mode: "CW" | "SSB" | "FM" | "DIGI" | null;
  qsoAt: string | null;    // ISO 8601 UTC
  operatorSquare: string;  // raw
  contactSquare: string;   // raw
  issues: SkipReason[];    // structural only (see Validation tiers)
}
```

`parseLog(content)` returns `{ format, stationCallsign, qsos }` with the QSOs
sorted by time (rows with no parseable time sort last). The package owns its own
band/mode constants (a test asserts the band set stays a subset of the
`QSO_BANDS` database enum).

### Cabrillo QSO line format

```
QSO: <freq> <mo> <date> <time> <mycall> <rst> <mysquare> <dxcall> <rst> <theirsquare>
```

| Field | Notes |
|---|---|
| `freq` | Frequency in kHz, or Cabrillo band designator (e.g. `144`, `1.2G`) |
| `mo` | Mode: `CW`, `PH`/`SSB`, `FM`, `RY`/`DG`/`DIGI` |
| `date` / `time` | `YYYY-MM-DD` / `HHMM` UTC |
| `mycall` | Operator callsign — must match the signed-in user (per-row check) |
| `mysquare` | Operator's WAL square, e.g. `A05` |
| `dxcall` | Contact callsign |
| `theirsquare` | Contact's WAL square (optional) |

The exchange is parsed by **anchoring on the two RST reports** (`mycall RST
[mysquare] dxcall RST [theirsquare]`) rather than fixed column offsets, so an
omitted square does not shift the remaining fields. A missing **contact** square
is simply empty; a missing **operator** square leaves `operatorSquare` empty
(flagged as a fixable `invalidSquare` in the dialog) instead of pulling the RST
into the callsign slot. Square fields are kept **raw** even when malformed (e.g.
`ZZ9`) so the dialog can fix them. `malformedLine` is reserved for lines that
cannot be split into two stations at all (e.g. no recognisable `dxcall`).

The `CALLSIGN:` header populates `stationCallsign`. The Cabrillo `CONTEST:`
header is no longer required or rejected.

### ADIF field mapping

ADIF records (`<NAME:len[:type]>value` fields ended by `<EOR>`, header ended by
`<EOH>`; field names case-insensitive) map as:

| ADIF field | Maps to |
|---|---|
| `CALL` | Contact callsign |
| `BAND` (e.g. `20m`) or `FREQ` (MHz) | Band — `FREQ` preferred when present |
| `MODE` / `SUBMODE` | Mode (USB/LSB→SSB, RTTY/FT8/FT4/PSK/JT*→DIGI, …) |
| `QSO_DATE` (YYYYMMDD) + `TIME_ON` (HHMM[SS]) | QSO timestamp (UTC) |
| `MY_SIG_INFO` | Operator WAL square |
| `SIG_INFO` | Contact WAL square (empty or `DX` ⇒ no square) |
| `STATION_CALLSIGN` / `OPERATOR` | Station callsign |

`MY_SIG` and `SIG` are expected to be `WAL` but are **ignored** — a missing or
different value does not reject the record.

The header `STATION_CALLSIGN` (or `OPERATOR`) is the per-record operator
fallback: a record without its own value inherits it, so every QSO shows the
station callsign.

### Validation tiers

| Tier | Where | Checks |
|---|---|---|
| Structural | `@WAL-GO/log-parse` (`issues`) | `invalidBand`, `invalidMode`, `invalidDate`, `invalidCallsign`, `malformedLine` |
| Square validity | Review dialog (live, via `@WAL-GO/grid`) | operator square required + valid; contact square valid / empty / `DX` |
| Contextual | `qsos.commitUpload` (authoritative) | `outsideSeason`, `selfContact`, `blockedCallsign`, `exactDuplicate`, `gameDuplicate` |

Structurally-invalid rows (bad band/mode/date) are shown in the dialog, marked,
and excluded from import (their square inputs are disabled — editing a square
cannot fix them). Rows whose only problem is the square are editable. The dialog
lists valid and invalid QSOs together, sorted by time. Bulk square-fill is not
implemented yet; squares are edited one row at a time.

There are two distinct callsign checks:

- The **header** station callsign (Cabrillo `CALLSIGN:` / ADIF `STATION_CALLSIGN`)
  is **advisory** only — a mismatch shows a banner but never blocks anything,
  because every QSO is inserted under the authenticated user regardless.
- The **per-row** operator callsign (`mycall` on each QSO line) **must** match the
  signed-in user. A row whose operator callsign differs is skipped with
  `callsignMismatch` — enforced both in the dialog and authoritatively in
  `commitUpload` (`validateClientQso`).

The review dialog also flags **within-log** duplicates — exact and game
duplicates **between rows of the same upload** — using keys that mirror the
server (`exactDuplicateKey`/`gameDuplicateKey`; game day in `Europe/Vilnius`).
These are marked fixable, since editing a square changes the key. Duplicates
**against the database** (other uploads / manual entries) still surface only at
`commitUpload`, which remains authoritative for all duplicate detection.

### Commit

`commitUpload({ format, content, qsos })` runs synchronously in a single DB
transaction. The client sends **every** parsed row (with edited squares) plus the
raw file `content`; the server re-derives accept/skip so the audit record is
faithful, and never trusts a client-supplied verdict for insertion. It returns:

```ts
{
  accepted: number;
  skipped: number;
  imported: ImportSuccess[];
  errors: ImportError[];
}
```

After a successful commit the dropzone shows a summary plus collapsible tables of
imported and skipped rows.

## QSO Storage

Each accepted QSO is stored in the database linked to:
- The submitting user
- The active season at time of submission
- The operator WAL square that received points
- The optional contact WAL square, when provided

## Log View

The `/log` page lists all QSOs the user has submitted in the current season. Columns include callsign, band, mode, date/time, the credited operator WAL square, and the optional contact WAL square. Manual creation opens `AddQsoDialog`; each row opens a separate `EditQsoDialog` for edits or can delete the QSO while the season is still active. Both dialogs share the lower-level `QsoForm` field component so validation and date/square handling stay consistent without merging the add and edit workflows.

### Responsive Design

The log table sits inside the shared `Table` component, which wraps the `<table>` in an `overflow-x-auto` container so wide content scrolls horizontally within the card rather than stretching the page. For this to work, the root layout grid (`__root.tsx`) declares `grid-cols-[minmax(0,1fr)]` — without an explicit, shrinkable column track the implicit `auto` column grows to the table's max-content width and blows out the page on the x axis. The `Mode` (Moduliacija) column is hidden below the `sm` breakpoint via a `meta.className` of `hidden sm:table-cell`, applied to both the header and body cells in the render loop, to keep the mobile table compact.

`QsoForm`'s field grid goes `1 → sm:2 → md:3` columns; the callsign field spans both columns at `sm` (`sm:col-span-2 md:col-span-1`) and the date/time field uses `sm:col-span-2`, which (Tailwind breakpoints being min-width) carries up to `md` so it spans two of the three columns there too. The shared `DialogContent` caps height at `max-h-[calc(100svh-2rem)]` with `overflow-y-auto` so the add/edit dialog scrolls on short viewports instead of overflowing off-screen. Cabrillo import result tables use `overflow-auto` for both axes. The native `type="time"` input carries `appearance-none`; without it, iOS Safari gives the input an intrinsic content-based width that ignores `w-full`/`min-w-0` and overflows the dialog to the right.

### Pagination

The log uses server-side pagination with a fixed page size of 20. Current page and band filter are stored as URL search params (`?page=N&band=X`), so they survive refresh and are bookmarkable. The `qsos.list` API endpoint accepts optional `page`, `band`, and `seasonId` inputs and returns `{ items, total, bands }` — where `bands` is the distinct list of bands the user has logged in the season (used to render filter chips). The `qsos.stats` endpoint is unaffected and still returns season-wide aggregates.

Band filtering is server-side: selecting a band resets to page 1. Previous/next pagination buttons appear below the table when there is more than one page.

The summary cards on `/log` are backed by server-side aggregates, not calculations over the currently loaded table rows. They show total QSOs, unique credited operator WAL squares, points from `user_season_score`, and unique contact callsigns for the active season.

### CRUD

| Operation | Supported | Notes                                              |
|-----------|-----------|----------------------------------------------------|
| Create    | Yes       | Manual entry, or Cabrillo/ADIF upload via the review dialog |
| Read      | Yes       | Paginated table on `/log`                          |
| Update    | Yes       | Edits the user's QSO while the season is active    |
| Delete    | Yes       | Removes the user's QSO from the active season      |

Editing runs the same WAL square, exact duplicate, game duplicate, and season-window validation as creating a QSO. The row remains linked to its original season and team. If the credited operator square changes, scoring is adjusted atomically by removing the old square point and adding the new square point. Other edits keep the point total unchanged.

Deleting a QSO that was the sole point giving a team control of its operator square immediately releases that square to the next-highest team (or to neutral if tied/empty).

## Callsign Normalization

Contact callsigns must match the shared `CALLSIGN_REGEX`
(`@WAL-GO/callsign`, `isValidCallsign` on the normalized base call) — the same
shape rule used for account callsigns at sign-up — so malformed entries like `L`
or `L1` are rejected. The shape is an ITU-style prefix (`[A-Z]\d`, one or two
letters, or `\d[A-Z]`), one or more area digits, then a one-or-more-letter suffix.
The unbounded digit/letter counts accommodate special-event calls like `DL100IARU`
and `VK100MARCONI`. This is enforced at every entry point: the manual form,
`qsos.create`/`update`, the import review dialog (`invalidCallsign`), and
`qsos.commitUpload`.

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
| `qsos.commitUpload` | 10 | 1 hour |

Exceeding a limit returns a `TOO_MANY_REQUESTS` error with the message "Per daug užklausų. Bandykite vėliau."

## User Callsign Requirement

A callsign is required on the user profile before logging QSOs. During import the
log's **header** station callsign (Cabrillo `CALLSIGN:` / ADIF `STATION_CALLSIGN`)
is compared against the signed-in operator and a mismatch is surfaced in the review
dialog as an advisory warning only. The **per-row** operator callsign, however, must
match the signed-in user: rows whose operator callsign differs are skipped with
`callsignMismatch` (see [Validation tiers](#validation-tiers)). Every imported QSO
is stored under the authenticated user regardless.
