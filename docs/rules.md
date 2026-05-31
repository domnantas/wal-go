# Rules Page

The `/rules` route renders the official game rules in Lithuanian. It is publicly accessible (no auth required) and linked from the header.

## Content Structure

Rules are rendered as numbered sections using three internal components:

| Component | Purpose |
|---|---|
| `RuleSection` | Top-level numbered section with `id`, `number`, and `title` |
| `Rule` | Individual numbered rule paragraph within a section |
| `Note` | Styled callout box for examples and alpha-season caveats |

Section `id` attributes enable deep-linking (e.g. `/rules#taskų-sistema`).

## Sections

| Number | ID | Title (LT) |
|---|---|---|
| 1 | `bendrosios-nuostatos` | Bendrosios nuostatos |
| 2 | `dalyviai` | Dalyviai |
| 3 | `sezonas` | Sezonas |
| 4 | `komandos` | Komandos |
| 5 | `wal-kvadratai` | WAL kvadratai |
| 6 | `qso-registravimas` | QSO registravimas |
| 7 | `taskų-sistema` | Taškų sistema |
| 8 | `teritorijos-kontrole` | Teritorijos kontrolė |
| 9 | `sezonų-pabaiga` | Sezono pabaiga |

## Key Rules Encoded

- Lithuania is divided into **394 WAL squares** (10′ × 10′).
- Three teams per season: **yellow, green, red**. Assignment is random and immutable within a season.
- Each accepted QSO awards **1 point** to the operator's square.
- Callsign normalization: both operator and contact callsigns are reduced to their base call before storage — prefixes and suffixes (`/P`, `/M`, country prefixes like `9A/`) are stripped. `LY2EN` and `LY2EN/P` from the same square on the same day count as one QSO; different squares make them distinct.
- Per-day duplicate rule: only one QSO with the same (normalized) call/band/mode/operator-square/contact-square counts per Lithuanian calendar day (midnight Europe/Vilnius). A different square, band, or mode makes a new QSO valid.
- A team **controls** a square when it has strictly more points than either rival. Tied leaders → neutral.
- Season winner: most squares controlled at end. Tiebreak: total points.
- Next season starts from zero — no carry-over.
- Admins may review QSOs and, on suspected cheating (fabricated QSOs, multi-accounting, rule circumvention), void QSOs and suspend or permanently delete the account; their decisions are final (rule 2.3).

## Navigation

The header links to `/rules`. The rules page is also referenced from the landing page (`/`).
