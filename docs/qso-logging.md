# QSO Logging

`/log` has two jobs: log file import (Cabrillo or ADIF) and QSO review/management.

Both write entry points are gated by season state: the dropzone and manual-QSO button show only when a season is active **and** the signed-in user has joined it. Active season but not joined → join-season prompt. No active season → controls hidden; a scheduled future season shows a live countdown to its `starts_at`.

## Manual Entry

Available after joining the active season. Fields:

| Field | Required | Notes |
|---|---|---|
| Contact callsign | Yes | Normalized to base call before storage (see Callsign Normalization). |
| QSO date/time | Yes | Stored as a timezone-aware timestamp. |
| Band | Yes | From the supported band list. |
| Mode | Yes | From the supported mode list. |
| Operator WAL square | Yes | Explicit WAL code, e.g. `A05`. |
| Contact WAL square | No | Explicit WAL code when known. |

The backend validates WAL codes are valid Lithuanian cells. Duplicate detection, scoring, and deletion all apply.

In the Add QSO dialog, pressing Space while the callsign field is focused moves focus to **Mano kvadratas** when that field is empty. If it already has a value, focus moves to **Korespondento kvadratas** instead. The space is used only as a navigation shortcut and is not added to the callsign.

### Geolocation square

The Add QSO dialog has a geolocation toggle next to **Mano kvadratas** (`GeolocationSquareButton`, driven by `useGeolocationSquare`). When enabled, the form derives the operator's square from `navigator.geolocation` + `calculateWal` (`@WAL-GO/grid`). Coordinates outside any valid cell leave the field untouched.

- **First click** triggers the browser permission prompt (spinner while pending).
- **Toggle persisted** in `localStorage` (`wal-go:geolocation-square-enabled`). Treated as *active* only when the flag is on **and** permission is still `granted`. Resetting permission to "ask" reverts the toggle to off without silently re-prompting.
- **iOS Safari has no geolocation Permissions API**, so permission never resolves to `granted` there. To avoid the toggle appearing permanently off, when the Permissions API is unsupported (`isPermissionsApiSupported()`) the toggle is active based on the stored flag alone.
- The square is **recalculated each time the dialog opens** (form remounts), so a moved operator gets their current square. With toggle on + permission granted, the field pre-fills on open.
- **Denied** → button disabled, crossed-out icon, toggle off.

Button states (lucide): Off → `Locate` (`outline`); On → `LocateFixed` (`default`/filled); Locating → `Spinner` (disabled); Denied/unsupported → `LocateOff` (disabled). A `Tooltip` (`@WAL-GO/ui`) explains the action; the trigger wraps the button in a `span` so the tooltip appears even while disabled. Labels mirror state ("Nustatyti kvadratą pagal vietą" / "Nenaudoti mano vietos" / "Vietos prieiga užblokuota").

The toggle renders only in `AddQsoDialog` (via the `geolocation` prop on `QsoForm`); the edit dialog keeps manual square entry. This opt-in is **separate** from the map geolocation opt-in (see [map.md](map.md)).

## Log Import (Cabrillo & ADIF)

A **two-step** flow — the file is parsed and shown in an editable review dialog; nothing is stored until submit.

1. User drops a `.log`/`.cbr`/`.cabrillo`/`.adi`/`.adif` file; read as text **in the browser**. Limit: **2 MB**.
2. `@WAL-GO/log-parse` parses it client-side (format auto-detected) into draft QSOs, opened in the **review dialog** (`log-review-dialog.tsx`).
3. User edits squares row by row and submits. `qsos.commitUpload` authoritatively re-validates, de-dupes, inserts, scores, and records the upload.

### Format detection

`detectLogFormat(content)` returns `adif` when content contains an ADIF marker (`<eor>`, `<eoh>`, or `<call:`, case-insensitive), else `cabrillo`.

### `@WAL-GO/log-parse`

A pure, dependency-free package shared by web and API, deliberately **lenient**: squares are returned **raw** (never dropped/nulled) so the dialog can fix them. Each draft:

```ts
interface DraftQso {
  index: number;           // line number (Cabrillo) or record index (ADIF)
  raw: string;             // source line / record, for the upload audit
  contactCallsign: string;
  band: string | null;
  mode: "CW" | "SSB" | "FM" | "DIGI" | null;
  qsoAt: string | null;    // ISO 8601 UTC
  operatorSquare: string;  // raw
  contactSquare: string;   // raw
  issues: SkipReason[];    // structural only
}
```

`parseLog(content)` returns `{ format, stationCallsign, qsos }`, QSOs sorted by time (no-time rows last). The package owns its band/mode constants (a test asserts the band set stays a subset of the `QSO_BANDS` DB enum).

### Cabrillo QSO line

```
QSO: <freq> <mo> <date> <time> <mycall> <rst> <mysquare> <dxcall> <rst> <theirsquare>
```

| Field | Notes |
|---|---|
| `freq` | kHz, or Cabrillo band designator (`144`, `1.2G`) |
| `mo` | `CW`, `PH`/`SSB`, `FM`, `RY`/`DG`/`DIGI` |
| `date`/`time` | `YYYY-MM-DD` / `HHMM` UTC |
| `mycall` | Operator callsign — must match the signed-in user (per-row) |
| `mysquare` | Operator's WAL square |
| `dxcall` | Contact callsign |
| `theirsquare` | Contact's WAL square (optional) |

The exchange is parsed by **anchoring on the two RST reports** (`mycall RST [mysquare] dxcall RST [theirsquare]`), not fixed columns, so an omitted square doesn't shift fields. A missing contact square is empty; a missing operator square leaves `operatorSquare` empty (fixable `invalidSquare`) rather than pulling RST into the callsign slot. Square fields stay raw even when malformed (e.g. `ZZ9`). `malformedLine` is reserved for lines with no recognisable two stations. The `CALLSIGN:` header populates `stationCallsign`; `CONTEST:` is no longer required or rejected.

### ADIF field mapping

Records are `<NAME:len[:type]>value` fields ended by `<EOR>`, header ended by `<EOH>`; field names case-insensitive.

| ADIF field | Maps to |
|---|---|
| `CALL` | Contact callsign |
| `BAND` (e.g. `20m`) or `FREQ` (MHz) | Band — `FREQ` preferred when present |
| `MODE` / `SUBMODE` | Mode (USB/LSB→SSB, RTTY/FT8/FT4/PSK/JT*→DIGI, …) |
| `QSO_DATE` (YYYYMMDD) + `TIME_ON` (HHMM[SS]) | QSO timestamp (UTC) |
| `MY_SIG_INFO` | Operator WAL square |
| `SIG_INFO` | Contact WAL square (empty or `DX` ⇒ none) |
| `STATION_CALLSIGN` / `OPERATOR` | Station callsign |

`MY_SIG`/`SIG` are expected to be `WAL` but **ignored** — a missing/different value doesn't reject. The header `STATION_CALLSIGN` (or `OPERATOR`) is the per-record operator fallback: a record without its own value inherits it.

### Validation tiers

| Tier | Where | Checks |
|---|---|---|
| Structural | `@WAL-GO/log-parse` (`issues`) | `invalidBand`, `invalidMode`, `invalidDate`, `invalidCallsign`, `malformedLine` |
| Square validity | Review dialog (live, `@WAL-GO/grid`) | operator square required + valid; contact valid / empty / `DX` |
| Contextual | `qsos.commitUpload` (authoritative) | `outsideSeason`, `selfContact`, `blockedCallsign`, `exactDuplicate`, `gameDuplicate` |

Structurally-invalid rows (bad band/mode/date) are shown, marked, and excluded — their square inputs are disabled (editing a square can't fix them). Square-only problems are editable. The dialog lists valid and invalid together, sorted by time. Bulk square-fill is not implemented; squares are edited one row at a time.

Two callsign checks:

- **Header** station callsign (Cabrillo `CALLSIGN:` / ADIF `STATION_CALLSIGN`) is **advisory** — a mismatch shows a banner but blocks nothing; every QSO is inserted under the authenticated user.
- **Per-row** operator callsign (`mycall`) **must** match the signed-in user. A mismatch is skipped with `callsignMismatch`, enforced in the dialog and authoritatively in `commitUpload` (`validateClientQso`).

The dialog also flags **within-log** duplicates (exact and game, between rows of the same upload) using server-mirroring keys (`exactDuplicateKey`/`gameDuplicateKey`; game day in `Europe/Vilnius`), marked fixable since editing a square changes the key. Duplicates **against the database** surface only at `commitUpload`, which remains authoritative.

### Commit

`commitUpload({ format, content, qsos })` runs synchronously in one DB transaction. The client sends **every** parsed row (with edited squares) plus the raw `content`; the server re-derives accept/skip so the audit is faithful and never trusts a client verdict for insertion. Returns:

```ts
{ accepted: number; skipped: number; imported: ImportSuccess[]; errors: ImportError[] }
```

After a successful commit the dropzone shows a summary plus collapsible tables of imported and skipped rows.

## QSO Storage

Each accepted QSO links to the submitting user, the active season at submission, the operator WAL square that received points, and the optional contact square.

## Log View

`/log` lists the user's QSOs for the current season: callsign, band, mode, date/time, credited operator square, optional contact square. Manual creation opens `AddQsoDialog`; each row opens `EditQsoDialog` for edit/delete while the season is active. Both dialogs share the lower-level `QsoForm`.

### Responsive design

The table sits in the shared `Table` component, which wraps `<table>` in `overflow-x-auto` so wide content scrolls within the card. The root layout grid (`__root.tsx`) declares `grid-cols-[minmax(0,1fr)]` — without an explicit shrinkable column track the implicit `auto` column grows to max-content and blows out the x axis. The Mode (Moduliacija) column is hidden below `sm` via a `meta.className` of `hidden sm:table-cell` on header and body cells.

`QsoForm`'s field grid goes `1 → sm:2`. Row 1 is a full-width sub-grid (`sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`) holding callsign + date/time, giving the date+time controls twice the callsign's width; band + mode share row 2, then **Mano kvadratas** + Korespondento kvadratas share row 3. Both square fields put their secondary label content (geolocation button / "Neprivaloma" `FieldDescription`) in a `flex justify-between` row beside the label, so the two inputs align vertically. The Add QSO and Edit QSO `DialogContent`s override the default `sm:max-w-2xl` with `sm:max-w-xl` for a narrower dialog; the shared `DialogContent` caps at `max-h-[calc(100svh-2rem)]` with `overflow-y-auto`. Import result tables use `overflow-auto` (both axes). The native `type="time"` input carries `appearance-none`; without it iOS Safari gives it an intrinsic width ignoring `w-full`/`min-w-0`, overflowing the dialog.

### Pagination

Server-side, fixed page size 20. Current page and band filter are URL search params (`?page=N&band=X`) — survive refresh, bookmarkable. `qsos.list` accepts optional `page`, `band`, `seasonId` and returns `{ items, total, bands }` (`bands` = distinct bands the user logged this season, for filter chips). Band filtering is server-side; selecting a band resets to page 1. Prev/next buttons show when there's more than one page.

Summary cards on `/log` are backed by server-side aggregates (`qsos.stats`), not loaded rows: total QSOs, unique credited operator squares, points from `user_season_score`, unique contact callsigns for the active season.

### CRUD

| Op | Notes |
|---|---|
| Create | Manual entry, or Cabrillo/ADIF upload via the review dialog |
| Read | Paginated table on `/log` |
| Update | Edits the user's QSO while the season is active |
| Delete | Removes the user's QSO from the active season |

Editing runs the same WAL square, exact-duplicate, game-duplicate, and season-window validation as creating. The row stays linked to its original season/team. If the credited operator square changes, scoring is adjusted atomically (remove old, add new); other edits keep the total. Deleting the sole point that gave a team control of a square immediately releases it to the next-highest team (or neutral if tied/empty).

## Callsign Normalization

Contact callsigns must match `CALLSIGN_REGEX` (`@WAL-GO/callsign`, `isValidCallsign` on the normalized base call) — the same shape rule as account callsigns — so `L`/`L1` are rejected. Shape: ITU-style prefix (`[A-Z]\d`, one-or-two letters, or `\d[A-Z]`), one+ area digits, then a one+-letter suffix. Unbounded counts accommodate special-event calls (`DL100IARU`, `VK100MARCONI`). Enforced at the manual form, `qsos.create`/`update`, the import review dialog (`invalidCallsign`), and `commitUpload`.

Both operator and contact callsigns are reduced to their **base call** before comparison/storage via `normalizeCallsign` (`packages/api/src/routers/qsos.ts`): uppercased, trimmed, split on `/`, longest part kept — strips operating suffixes (`/P`, `/M`, `/MM`, `/QRP`) and country prefixes (`9A/LY2EN`).

- The operator's `mycall` is normalized only to **match** the logged-in user.
- The contact's `dxcall` is normalized and **stored** as the base call, so suffix variants collapse to one identity. Location isn't lost — the WAL square carries it. `LY2EN` from `A05` and `LY2EN/P` from `A06` stay two scoring QSOs (different squares); from the **same** square on the same day they collapse to one.

> Historical rows inserted before this change keep their raw suffix and are not back-filled.

## Rate Limits

All write endpoints are rate-limited per authenticated user via the shared `rate_limit` table.

| Endpoint | Max | Window |
|---|---|---|
| `qsos.create` | 120 | 60s |
| `qsos.update` | 120 | 60s |
| `qsos.delete` | 120 | 60s |
| `qsos.commitUpload` | 10 | 1 hour |

Exceeding a limit returns `TOO_MANY_REQUESTS` with "Per daug užklausų. Bandykite vėliau."

## User Callsign Requirement

A callsign is required on the profile before logging. On import the **header** station callsign is compared against the operator as an advisory warning; the **per-row** operator callsign must match (mismatch skipped with `callsignMismatch`). Every imported QSO is stored under the authenticated user regardless.
