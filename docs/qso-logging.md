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

### Blur validation

Fields validate on blur only if they are **dirty** — i.e. the user has typed into them at least once (`handleFieldBlur` in `@WAL-GO/ui/lib/form`, gating on TanStack Form's sticky `field.state.meta.isDirty`). A pristine field (never edited) does not validate on blur, so tabbing past it, clicking the date picker, toggling the **Neuždaryti lango** switch, or clicking the close button never surfaces a "required" error. Because the dialog is vertically centered (`fixed top-1/2 -translate-y-1/2`), a freshly rendered error would otherwise grow it, re-center it, and shift controls out from under a pending click. A field that was typed into and then cleared stays dirty, so it correctly shows the "required" error on blur. Full validation still runs on submit.

### Keep dialog open

The Add QSO dialog has a **Neuždaryti lango** switch in the footer's bottom left (`QsoForm`, gated on the `onKeepOpenChange` prop so only `AddQsoDialog` shows it). When on, a successful save leaves the dialog open instead of closing it, clears the **Šaukinys** and **Korespondento kvadratas** fields, and refocuses the callsign input — band, mode, date/time, and **Mano kvadratas** carry over for fast back-to-back logging. To make the post-save reset depend on success, `QsoForm` awaits `onSubmit` and skips the reset when it returns `false`; `AddQsoDialog` uses `mutateAsync` and returns `false` on error. The refocus runs from an effect on the `isPending` true→false transition (the callsign input is `disabled` while pending, so focusing it synchronously after submit would no-op). The toggle is persisted in `localStorage` (`qso-keep-open`).

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

A pure package shared by web and API (its only workspace dependency is `@WAL-GO/grid`, for the Cabrillo GRID-LOCATOR fallback below), deliberately **lenient**: squares are returned **raw** (never dropped/nulled) so the dialog can fix them. Each draft:

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

The exchange is parsed by **anchoring on the two RST reports** (`mycall RST [mysquare] dxcall RST [theirsquare]`), not fixed columns, so an omitted square doesn't shift fields. A missing contact square is empty; a missing operator square leaves `operatorSquare` empty (fixable `invalidSquare`) rather than pulling RST into the callsign slot. Square fields stay raw even when malformed (e.g. `ZZ9`), **except** a pure-digit exchange (e.g. `001`), which some loggers emit as a serial number instead of a WAL square — it is ignored (empty square), since a real WAL square always has a leading letter. RST anchoring also requires the report to follow a letter-bearing token, so a serial is never mistaken for an RST. `malformedLine` is reserved for lines with no recognisable two stations. The `CALLSIGN:` header populates `stationCallsign`; `CONTEST:` is no longer required or rejected.

#### GRID-LOCATOR fallback

Some loggers (e.g. N1MM) export no per-row operator square, only a station-wide `GRID-LOCATOR:` header carrying a Maidenhead locator (e.g. `KO24PR`). When present, the header is converted to a WAL square via `walFromMaidenhead` (`@WAL-GO/grid`: Maidenhead → lat/lng → `calculateWal`) and used as the **fallback** operator square for any row whose `mysquare` is empty. An explicit per-row square always wins; an invalid/out-of-grid locator yields no fallback.

### ADIF field mapping

Records are `<NAME:len[:type]>value` fields ended by `<EOR>`, header ended by `<EOH>`; field names case-insensitive.

| ADIF field | Maps to |
|---|---|
| `CALL` | Contact callsign |
| `BAND` (e.g. `20m`) or `FREQ` (MHz) | Band — `FREQ` preferred when present |
| `MODE` / `SUBMODE` | Mode (USB/LSB→SSB, RTTY/FT8/FT4/PSK/JT*→DIGI, …) |
| `QSO_DATE` (YYYYMMDD) + `TIME_ON` (HHMM[SS]) | QSO timestamp (UTC) |
| `MY_SIG_INFO` | Operator WAL square (falls back to `MY_GRIDSQUARE`) |
| `SIG_INFO` | Contact WAL square (empty or `DX` ⇒ none; falls back to `GRIDSQUARE`) |
| `STATION_CALLSIGN` / `OPERATOR` | Station callsign |

`MY_SIG`/`SIG` are expected to be `WAL` but **ignored** — a missing/different value doesn't reject. The header `STATION_CALLSIGN` (or `OPERATOR`) is the per-record operator fallback: a record without its own value inherits it.

#### GRIDSQUARE fallback

Many loggers omit the WAL-specific `MY_SIG_INFO`/`SIG_INFO` but still carry the Maidenhead locator (`MY_GRIDSQUARE` / `GRIDSQUARE`). When the corresponding `*_SIG_INFO` is empty, the grid field is converted to a WAL square via `walFromMaidenhead` (`@WAL-GO/grid`) and used as the square. An explicit `SIG_INFO` always wins; an invalid/out-of-grid locator yields no fallback (square stays empty, fixable in the dialog). This mirrors the Cabrillo `GRID-LOCATOR` fallback, but is **per-record** (ADIF carries grids per QSO) and covers the **contact** square too.

### Validation tiers

| Tier | Where | Checks |
|---|---|---|
| Structural | `@WAL-GO/log-parse` (`issues`) | `invalidBand`, `invalidMode`, `invalidDate`, `invalidCallsign`, `malformedLine` |
| Square validity | Review dialog (live, `@WAL-GO/grid`) | operator square required + valid; contact valid / empty / `DX` |
| Contextual | `qsos.commitUpload` (authoritative) | `outsideSeason`, `selfContact`, `blockedCallsign`, `exactDuplicate`, `gameDuplicate` |

Structurally-invalid rows (bad band/mode/date) are shown, marked, and excluded — their square inputs are disabled (editing a square can't fix them). Square-only problems are editable. The dialog lists valid and invalid together, sorted by time.

**Fill-down:** each square input has a small arrow-down button (`FillDownButton`, lucide `ArrowDown`) that copies the row's current value into the same field of **every row below it** (across all pages — operates on the full `rows` array, not just the visible page). Disabled when the field is empty, on the last row, or while committing. This makes a station-wide operator square (the common case) fillable in one click instead of editing 100+ rows. History-based prefill is deliberately **not** used — operators and contacts move, so a past square may be wrong.

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

### Page load

`/log` shows a single centered spinner until **all** of its first-paint queries resolve — the season queries (`current`, `myMembership`, `list`, `participated`) plus `qsos.stats` and the first `qsos.list` page. Folding the stats and QSO queries into this gate prevents the earlier staggered paint where the dropzone appeared first and the stats grid then popped in above it, shifting content down. The QSO list uses `placeholderData: keepPreviousData`, so band/page changes keep the previous rows visible (no spinner) instead of re-triggering the gate.

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
