# Sezonai (seasons)

WAL GO žaidžiamas sezonais. Sezonas turi pradžios ir pabaigos datą; trukmė varijuoja (beta sezonai – trumpesni, kelių dienų ar savaičių).

## Gyvavimo ciklas

Sezono būsena išvedama iš datų – atskiro `status` lauko nėra:

| Būsena | Sąlyga |
| --- | --- |
| `upcoming` | `now() < starts_at` |
| `active` | `starts_at <= now() <= ends_at` |
| `ended` | `now() > ends_at` |

Vienu metu aktyvus tik vienas sezonas. Šiuo metu apribojimas saugomas seedinimo metu (be DB constraint).

## Komandos

Trys fiksuotos komandos: `yellow`, `green`, `red`. Komandos egzistuoja kaip `team_color` enum – jokios atskiros lentelės. Naudotojas gali būti skirtingose komandose skirtinguose sezonuose.

## Prisijungimas (rato sukimas)

1. Naudotojas atidaro `/seasons`.
2. Jeigu yra aktyvus sezonas ir naudotojas dar neprisijungęs, jam rodomas mygtukas „Sukti ratą“.
3. Paspaudus mygtuką iškviečiama `seasons.join` mutacija. **Serveris** atsitiktinai parenka komandą (`yellow`/`green`/`red`) ir įrašo įrašą į `season_membership`.
4. Pakartotinis iškvietimas grąžina tą pačią narystę – komanda užfiksuojama pirmą kartą prisijungus ir negali būti pakeista to paties sezono metu.

`(user_id, season_id)` unikalus indeksas užtikrina idempotenciją net esant lygiagrečioms užklausoms.

## Sezono kūrimas

Beta etape sezonai pridedami tiesiai į DB per `pnpm db:studio`. Administracinė sąsaja bus pridėta vėliau.

## Žaidimo kontekstas (likusios sistemos)

Sezonai yra tik žaidimo įėjimo taškas. Visa žaidimo eiga (radijo ryšiai – QSO, WAL kvadratai, taškai, teritorijos kontrolė) bus aprašyta atskiruose dokumentuose:

- `docs/squares.md` – Lietuvos suskirstymas į WAL kvadratus.
- `docs/scoring.md` – kaip QSO virsta taškais ir kaip nustatoma kvadrato kontrolė.

Šiuo metu `docs/seasons.md` apima **tik** sezonus ir komandų narystę.

## Schemos

`packages/db/src/schema/seasons.ts`:

- `season` – sezono įrašas (`name`, `starts_at`, `ends_at`, `public_id`).
- `team_color` – Postgres enum (`yellow` | `green` | `red`).
- `season_membership` – naudotojo narystė konkrečiame sezone (`user_id`, `season_id`, `team`, `joined_at`).

## API (`packages/api/src/routers/seasons.ts`)

| Procedūra | Tipas | Aprašymas |
| --- | --- | --- |
| `seasons.current` | `publicProcedure` query | Grąžina aktyvų sezoną arba `null`. |
| `seasons.list` | `publicProcedure` query | Visi sezonai su išvesta būsena, surūšiuoti pagal `starts_at desc`. |
| `seasons.myMembership` | `protectedProcedure` query | Dabartinio naudotojo narystė aktyviame sezone arba `null`. |
| `seasons.join` | `protectedProcedure` mutation | Idempotentiškas prisijungimas – serveris parenka komandą. |
