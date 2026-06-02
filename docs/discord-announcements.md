# Discord announcements

Posts a Discord message whenever a square changes its controlling team, so the
community channel reflects takeovers as they happen.

## Control rule

A square is controlled by the team holding **strictly more** points than every
other team in that square. A tie for the lead, or an all-zero square, is
uncontrolled. The rule lives in one place — `computeLeader` in
`packages/api/src/scoring/control.ts` — and is shared by the team standings
query (`packages/api/src/routers/scoring.ts`) and the takeover detector.

## What is announced

Three transitions, each as one Lithuanian line:

| Transition | Example message |
| --- | --- |
| First claim (uncontrolled → team) | `🟡 Kvadratą K12 užėmė komanda Geltona!` |
| Overtake (team → other team) | `🔴 Kvadratą K12 perėmė komanda Raudona (buvo: 🟢 Žalia).` |
| Lost to tie (team → uncontrolled) | `⚪ Kvadratas K12 tapo nevaldomas (buvo: 🟢 Žalia).` |

Team labels and emoji come from `TEAM_DISPLAY` in `control.ts`. Squares have no
human-readable name, so the 3-character code is used directly.

## How detection works

Every score-changing path funnels through a single function,
`applyScoreDeltas(tx, seasonId, deltas)` in
`packages/api/src/scoring/apply-deltas.ts`, so detection lives there:

1. Snapshot the controlling team of each affected square **before** applying the
   deltas.
2. Apply the deltas (unchanged).
3. Snapshot again **after** the zero-row cleanup.
4. Return one `OwnershipChange` per square whose controller differs.

`applyScoreDeltas` runs inside the DB transaction, so it only *detects and
returns* changes — it never posts. Each router handler returns the changes
alongside its payload and calls `announceOwnershipChanges` **after** the
transaction commits, so a rolled-back transaction announces nothing.

Wired call sites:

- Interactive QSO `create`, `update`, `delete`, and Cabrillo `importCabrillo`
  (`packages/api/src/routers/qsos.ts`).
- Admin `banUser`, `unbanUser`, `deleteUser`, and `deleteQso`
  (`packages/api/src/routers/admin.ts`) — these flow through
  `applyUserBanScoreChange` / `applyScoreDeltas`.

`recomputeSeasonScores` (admin drift repair) wipes and rebuilds score tables
directly and is intentionally **not** instrumented.

A single transaction's changes are sent as one webhook message (one line each),
split into multiple POSTs only if the content exceeds Discord's 2000-character
limit. A bulk import therefore produces one batched summary rather than a flood.

## Delivery

`announceOwnershipChanges` (`packages/api/src/notifications/discord.ts`) POSTs to
a Discord **incoming webhook**. A persistent gateway bot is not used because the
app runs on Cloudflare Workers (short-lived request handlers, no long-running
process).

Delivery never affects the QSO flow:

- It runs in the **background** via `waitUntil` from `cloudflare:workers`, which
  keeps the request alive to finish the POST after the response is sent. The
  import is guarded the same way as `packages/db/src/index.ts`; outside Workers
  (Node/dev) the promise simply runs un-awaited.
- A missing webhook URL is a no-op; any delivery error is logged and swallowed.
  The QSO/admin action always succeeds regardless.

## Configuration

Set the `DISCORD_WEBHOOK_URL` environment variable to a Discord channel webhook
URL (Server Settings → Integrations → Webhooks → New Webhook → Copy URL). When
unset, announcements are silently disabled.

- Optional getter: `env.DISCORD_WEBHOOK_URL` in `packages/env/src/server.ts`
  (reads `process.env`, populated on Workers via the
  `nodejs_compat_populate_process_env` flag).
- Type: `packages/env/env.d.ts` (`CloudflareEnv.DISCORD_WEBHOOK_URL`).
- Deploy secret: bound in `packages/infra/alchemy.run.ts` only when present, and
  set in local `apps/web/.env` for development.

## Known limitation

Announcements are best-effort. Same-square QSOs from different users are not
serialized against each other (the lock is per-user), so under simultaneous
flips of the same square a duplicate or missed line is possible. This is
accepted — announcements are cosmetic and never affect scoring.
