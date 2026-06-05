# Rules Page

`/rules` renders the official game rules in Lithuanian. Publicly accessible (no auth), linked from the header and the landing page.

## Structure

Rules are numbered sections built from three internal components:

| Component | Purpose |
|---|---|
| `RuleSection` | Top-level numbered section with `id`, `number`, `title` |
| `Rule` | Individual numbered rule paragraph |
| `Note` | Styled callout for examples and alpha-season caveats |

Section `id`s enable deep-linking (e.g. `/rules#taskų-sistema`). Each `Rule` is also deep-linkable: it renders `id="rule-<n>"` (e.g. `/rules#rule-7.3`), and its number is a clickable anchor. Anchored targets use `scroll-mt-24` to clear the fixed header.

## Sections

| # | ID | Title (LT) |
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

## Key rules encoded

- Lithuania is divided into **394 WAL squares** (10′ × 10′).
- Three teams per season: **yellow, green, red**. Assignment random and immutable within a season.
- Each accepted QSO awards **1 point** to the operator's square.
- Callsign normalization: both operator and contact callsigns reduce to base call before storage — prefixes/suffixes (`/P`, `/M`, country prefixes like `9A/`) stripped. `LY2EN` and `LY2EN/P` from the same square on the same day count as one; different squares make them distinct.
- Per-day duplicate rule: only one QSO with the same (normalized) call/band/mode/operator-square/contact-square counts per Lithuanian calendar day (midnight Europe/Vilnius). A different square, band, or mode makes a new valid QSO.
- A team **controls** a square with strictly more points than either rival; tied leaders → neutral.
- Season winner: most squares controlled at end; tiebreak total points. Next season starts from zero — no carry-over.
- On suspected cheating (fabricated QSOs, multi-accounting, rule circumvention), admins may void QSOs and suspend or permanently delete the account; decisions are final (rule 2.3).
