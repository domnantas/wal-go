# Rules Page

`/rules` renders the official game rules in Lithuanian. Publicly accessible (no auth), linked from the header and the landing page.

## Structure

Rules are numbered sections built from three internal components:

| Component | Purpose |
|---|---|
| `RuleSection` | Top-level numbered section with `id`, `number`, `title` |
| `Rule` | Individual numbered rule paragraph; `changed` prop renders an "Atnaujinta" badge |
| `Note` | Styled callout for examples and season caveats |

Rules changed in the alpha → beta transition are flagged with `changed` on `Rule`, which renders an olive "Atnaujinta" badge before the text. Currently marked: **6.4** (contact square now required), **7.1** (mode-weighted points, was flat 1), **7.2** (confirmation doubling, new). Clear these flags once the changes stop being recent — keep them in sync with the [rule change banner](#rule-change-banner).

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

The page reflects the **active season's rule set**. It currently describes the **beta** rules; see [scoring.md](scoring.md) for the per-rule-set scoring source of truth.

- Lithuania is divided into **394 WAL squares** (10′ × 10′).
- Three teams per season: **yellow, green, red**. Assignment random and immutable within a season.
- Contact WAL square is **required** (beta) — the field cannot be empty. DX (foreign) contacts are allowed and score: enter the literal `DX` instead of a WAL square. `DX` is stored as-is and never confirms (no square to swap).
- Mode-weighted points on the operator's square: **DIGI = 1**, **CW / SSB / FM = 2**.
- **Confirmation doubles** points for both stations when both log the matching QSO (same band/mode, swapped squares, timestamps within 5 min). Applied dynamically as the second side logs; removed if a confirmed QSO is deleted.
- Callsign normalization: both operator and contact callsigns reduce to base call before storage — prefixes/suffixes (`/P`, `/M`, country prefixes like `9A/`) stripped. `LY2EN` and `LY2EN/P` from the same square on the same day count as one; different squares make them distinct.
- Per-day duplicate rule: only one QSO with the same (normalized) call/band/mode/operator-square/contact-square counts per Lithuanian calendar day (midnight Europe/Vilnius). A different square, band, or mode makes a new valid QSO.
- A team **controls** a square with strictly more points than either rival; tied leaders → neutral.
- Season winner: most squares controlled at end; tiebreak total points. Next season starts from zero — no carry-over.
- On suspected cheating (fabricated QSOs, multi-accounting, rule circumvention), admins may void QSOs and suspend or permanently delete the account; decisions are final (rule 2.3).

## Rule change banner

`RuleChangeBanner` (`components/rule-change-banner.tsx`) is a site-wide strip rendered in the root layout (`routes/__root.tsx`) between the header and page content. It announces recent rule changes and links to `/rules`.

- **Dismissal is versioned.** It stores the constant `BANNER_VERSION` under `localStorage["wal-go-rule-change-banner"]` and only hides when the stored value matches the current version. Bump `BANNER_VERSION` whenever rules change again to re-show the banner to everyone (including users who dismissed the previous one).
- Update the banner copy (and `BANNER_VERSION`) together with the rule change it announces.
- Hidden on `/maintenance`, matching the header.
