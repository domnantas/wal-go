# QSO Logging

The `/log` page has two responsibilities: Cabrillo file import and QSO log review/management.

## Manual Entry

Signed-in users can add QSOs manually from `/log` after joining the active season.

Manual entry captures:

| Field | Required | Notes |
| --- | --- | --- |
| Contact callsign | Yes | Stored uppercase. |
| QSO date/time | Yes | Stored as a timezone-aware timestamp. |
| Band | Yes | Selected from the UI's supported band list. |
| Mode | Yes | Selected from the UI's supported mode list. |
| Operator WAL square | Yes | Explicit WAL code, e.g. `A05`. |
| Contact WAL square | No | Explicit WAL code when known. |

The backend validates that WAL square codes are valid Lithuanian WAL cells. Duplicate detection, scoring updates, and QSO deletion are implemented for manual entry.

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

The `/log` page lists all QSOs the user has submitted in the current season, paginated. Columns include callsign, band, mode, date/time, the credited operator WAL square, and the optional contact WAL square.

The summary cards on `/log` are backed by server-side aggregates, not calculations over the currently loaded table rows. They show total QSOs, unique credited operator WAL squares, points from `user_season_score`, and unique contact callsigns for the active season.

### CRUD

| Operation | Supported | Notes                                              |
|-----------|-----------|----------------------------------------------------|
| Create    | Yes       | Via manual entry now; ADIF upload later           |
| Read      | Yes       | Paginated table on `/log`                          |
| Update    | No        | Delete and resubmit to correct a record            |
| Delete    | Yes       | Removes the user's QSO from the active season      |

Deleting a QSO that was the sole point giving a team control of its operator square immediately releases that square to the next-highest team (or to neutral if tied/empty).

## User Callsign Requirement

A callsign is required on the user profile before logging QSOs. The callsign is used to validate that the `STATION_CALLSIGN` field in the ADIF matches the logged-in operator (exact validation rules TBD during implementation).
