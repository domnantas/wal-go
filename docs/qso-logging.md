# QSO Logging

The `/log` page has two responsibilities: ADIF file import and QSO log review/management.

## Current Implementation: Manual Entry

The first implemented slice supports manual QSO entry for the active season.
Signed-in users can add QSOs from `/log` after joining the active season.

Manual entry captures:

| Field | Required | Notes |
| --- | --- | --- |
| Contact callsign | Yes | Stored uppercase. |
| QSO date/time | Yes | Stored as a timezone-aware timestamp. |
| Band | Yes | Selected from the UI's supported band list. |
| Mode | Yes | Selected from the UI's supported mode list. |
| Operator WAL square | Yes | Explicit WAL code, e.g. `A05`. |
| Contact WAL square | No | Explicit WAL code when known. |

The backend validates that WAL square codes are valid Lithuanian WAL cells. Duplicate detection, scoring updates, and QSO deletion are implemented for manual entry. ADIF import is planned but not implemented yet.

## ADIF Import

ADIF import is planned but not implemented yet.

Users upload an `.adif` file. The server parses every QSO record and awards points to WAL squares.

### Square Assignment per QSO

For the alpha season, each accepted QSO scores only the operator's square. The contact's square may still be stored when known, but it does not generate points.

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
- Contact's square is optional; missing values are accepted. In the alpha season, a provided contact square is stored for reference but does not score.
- Exact duplicate detection rejects accidental double submission of the same stored QSO by the same user in the same season.
- Game duplicate detection is scoring-rule controlled. In the alpha season, only one QSO with the same `CALL`, `BAND`, `MODE`, operator square, and contact square is valid per Lithuanian calendar day. The day boundary is midnight Lithuanian time (Europe/Vilnius, UTC+2/UTC+3). If either station changes square, another QSO with the same call, band, and mode is valid that day.

### Processing Pipeline

ADIF files can contain tens of thousands of QSOs. Upload is processed asynchronously:

1. Client posts file to upload endpoint → server stores raw file + creates `adif_import` job row → returns `jobId`.
2. Background worker picks up the job, parses ADIF in chunks, inserts accepted QSOs and updates `square_score` / `user_season_score` for operator squares in transactions per chunk.
3. Client polls `imports/:jobId` for progress (`pending` → `processing(N/M)` → `done` / `failed`) and a final summary (accepted, skipped, reasons).

Worker runs in the same process initially (DB-backed job queue), can be split into a separate process later if needed.

### Processing Result

When the job completes, the user sees a summary: how many QSOs were accepted, how many skipped, and reasons for skips.

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
