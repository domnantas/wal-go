# Discord announcements

Posts a Discord message whenever a square changes its controlling team, so the community channel reflects takeovers as they happen. For automatic team-role assignment (a separate feature with its own bot token), see [discord-roles.md](discord-roles.md).

## Control rule

A square is controlled by the team with **strictly more** points than every other team; a tie for the lead or an all-zero square is uncontrolled. The rule lives once in `computeLeader` (`packages/api/src/scoring/control.ts`), shared by the team-standings query (`packages/api/src/routers/scoring.ts`) and the takeover detector.

## What is announced

Three transitions, each one Lithuanian line:

| Transition | Example |
|---|---|
| First claim (uncontrolled → team) | `🟡 Kvadratą K12 užėmė komanda Geltona!` |
| Overtake (team → other team) | `🔴 Kvadratą K12 perėmė komanda Raudona (buvo: 🟢 Žalia).` |
| Lost to tie (team → uncontrolled) | `⚪ Kvadratas K12 tapo nevaldomas (buvo: 🟢 Žalia).` |

Labels and emoji come from `TEAM_DISPLAY` in `control.ts`. Squares have no name, so the 3-char code is used directly.

## Detection

Every score-changing path funnels through `applyScoreDeltas(tx, seasonId, deltas)` (`packages/api/src/scoring/apply-deltas.ts`), so detection lives there:

1. Snapshot each affected square's controller **before** applying deltas.
2. Apply deltas (unchanged).
3. Snapshot again **after** zero-row cleanup.
4. Return one `OwnershipChange` per square whose controller differs.

It runs inside the DB transaction, so it only *detects and returns* changes — it never posts. Each router handler returns the changes alongside its payload and calls `announceOwnershipChanges` **after** commit, so a rolled-back transaction announces nothing.

Wired call sites:

- Interactive QSO `create`, `update`, `delete`, and log `commitUpload` (`packages/api/src/routers/qsos.ts`).
- Admin `banUser`, `unbanUser`, `deleteUser`, `deleteQso` (`packages/api/src/routers/admin.ts`) — via `applyUserBanScoreChange` / `applyScoreDeltas`.

`recomputeSeasonScores` (drift repair) wipes and rebuilds tables directly and is intentionally **not** instrumented.

The same `OwnershipChange[]` is also **persisted** to `square_control_history` inside `applyScoreDeltas` (same transaction), powering the in-app activity feed ([activity-feed.md](activity-feed.md)). Discord delivery stays a separate, post-commit, best-effort side effect.

A single transaction's changes are sent as one webhook message (one line each), split into multiple POSTs only if over Discord's 2000-char limit. A bulk import produces one batched summary, not a flood.

## Delivery

`announceOwnershipChanges` (`packages/api/src/notifications/discord.ts`) POSTs to a Discord **incoming webhook**. A persistent gateway bot isn't used because the app runs on Cloudflare Workers (short-lived request handlers).

Delivery never affects the QSO flow:

- Runs in the **background** via `waitUntil` (`cloudflare:workers`), which keeps the request alive to finish the POST after the response. The import is guarded like `packages/db/src/index.ts`; outside Workers (Node/dev) the promise runs un-awaited.
- A missing webhook URL is a no-op; any delivery error is logged and swallowed. The QSO/admin action always succeeds.

## Configuration

Set `DISCORD_WEBHOOK_URL` to a Discord channel webhook URL (Server Settings → Integrations → Webhooks → New Webhook → Copy URL). When unset, announcements are silently disabled.

- Getter: `env.DISCORD_WEBHOOK_URL` (`packages/env/src/server.ts`, reads `process.env`, populated on Workers via `nodejs_compat_populate_process_env`).
- Type: `packages/env/env.d.ts` (`CloudflareEnv.DISCORD_WEBHOOK_URL`).
- Deploy secret: bound in `packages/infra/alchemy.run.ts` only when `process.env.DISCORD_WEBHOOK_URL` is present at deploy time. The CI runner only sees it if the GitHub secret is mapped into the deploy step's `env:` in `.github/workflows/deploy.yml` (`DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}`) — a GitHub repo secret is **not** auto-exposed as an env var. If the mapping is missing the binding is silently skipped and the worker never gets the secret. Set in local `apps/web/.env` for dev.

## Known limitation

Best-effort. Same-square QSOs from different users aren't serialized against each other (the lock is per-user), so under simultaneous flips of the same square a duplicate or missed line is possible. Accepted — announcements are cosmetic and never affect scoring.
