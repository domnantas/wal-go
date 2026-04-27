# QSO Logging

The `/log` page has two responsibilities: ADIF file import and QSO log review/management.

## ADIF Import

Users upload an `.adif` file. The server parses every QSO record and awards points to WAL squares.

### Square Assignment per QSO

Each QSO can generate points for up to two squares: the operator's square (always, when known) and the contact's square (when known).

#### Open decision: locator vs SIG_INFO

Two ADIF approaches are on the table; final choice is TBD during implementation.

**Option A — Maidenhead grid locator** (`MY_GRIDSQUARE` / `GRIDSQUARE`)

| Field           | Meaning                  |
|-----------------|--------------------------|
| `MY_GRIDSQUARE` | Operator's Maidenhead locator |
| `GRIDSQUARE`    | Contact's Maidenhead locator  |

- Pro: nearly all logging software auto-fills `MY_GRIDSQUARE`.
- Con: 4-char locators (2°×1°) are too coarse — they overlap multiple WAL squares. Need 6-char (~5′×2.5′) to resolve unambiguously to one WAL cell.
- Con: requires Maidenhead → WAL coordinate conversion server-side.

**Option B — Special Interest Group reference** (`SIG` / `SIG_INFO` and `MY_SIG` / `MY_SIG_INFO`), modeled on POTA

| Field           | Value          |
|-----------------|----------------|
| `MY_SIG`        | `WAL`          |
| `MY_SIG_INFO`   | WAL square ID (e.g. `A05`) |
| `SIG`           | `WAL`          |
| `SIG_INFO`      | WAL square ID  |

- Pro: explicit WAL square ID, zero geocoding ambiguity.
- Pro: follows existing convention used by POTA, SOTA, etc.
- Con: requires logging software / operator to fill it explicitly; many won't.
- Con: contacts almost never log a foreign program's `SIG_INFO`.

**Likely resolution:** support Option A for operator location (universally available) and Option B for explicit WAL-aware logs; allow either; prefer the more specific one when both are present.

### Validation

- Operator's WAL square must resolve to a valid Lithuanian cell; QSOs outside Lithuania are silently skipped.
- Contact's square is optional; missing or invalid values are ignored — the operator square still scores.
- Duplicate detection: only one QSO with the same `CALL` and `BAND` is valid per calendar day. The day boundary is midnight Lithuanian time (Europe/Vilnius, UTC+2/UTC+3). A second QSO with the same call and band on the same Lithuanian calendar day is rejected regardless of mode or time.

### Processing Pipeline

ADIF files can contain tens of thousands of QSOs. Upload is processed asynchronously:

1. Client posts file to upload endpoint → server stores raw file + creates `adif_import` job row → returns `jobId`.
2. Background worker picks up the job, parses ADIF in chunks, inserts accepted QSOs and updates `square_score` / `user_season_score` in transactions per chunk.
3. Client polls `imports/:jobId` for progress (`pending` → `processing(N/M)` → `done` / `failed`) and a final summary (accepted, skipped, reasons).

Worker runs in the same process initially (DB-backed job queue), can be split into a separate process later if needed.

### Processing Result

When the job completes, the user sees a summary: how many QSOs were accepted, how many skipped, and reasons for skips.

## QSO Storage

Each accepted QSO is stored in the database linked to:
- The submitting user
- The active season at time of submission
- The derived WAL square(s) that received points

## Log View

The `/log` page lists all QSOs the user has submitted in the current season, paginated. Columns include callsign, band, mode, date/time, and the WAL square(s) credited.

### CRUD

| Operation | Supported | Notes                                              |
|-----------|-----------|----------------------------------------------------|
| Create    | Yes       | Via ADIF upload                                    |
| Read      | Yes       | Paginated table on `/log`                          |
| Update    | No        | Delete and resubmit to correct a record            |
| Delete    | Yes       | Removes QSO and decrements team's points on the affected square(s) |

Deleting a QSO that was the sole point giving a team control of a square will immediately release that square to the next-highest team (or to neutral if tied/empty).

## User Callsign Requirement

A callsign is required on the user profile before logging QSOs. The callsign is used to validate that the `STATION_CALLSIGN` field in the ADIF matches the logged-in operator (exact validation rules TBD during implementation).
