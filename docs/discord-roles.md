# Discord team roles

Players link their Discord account in settings and Discord grants a role for
their current-season team via **[Linked Roles](https://discord.com/developers/docs/resources/user#application-role-connection)**.
The app never assigns roles directly — it pushes per-user *metadata* and Discord
grants/revokes the linked roles a server admin configured against that metadata.
Distinct from [discord-announcements.md](discord-announcements.md), which posts
square-takeover messages via a webhook.

Why Linked Roles instead of a bot assigning roles: no bot in the guild, no
**Manage Roles** permission, no role-hierarchy footgun. The trade-off is a
one-time per-user "connect" step in Discord and admin-configured linked roles.

## Metadata model

One integer field, `team`, pushed per user:

| Value | Team |
|---|---|
| 1 | Geltona (yellow) |
| 2 | Žalia (green) |
| 3 | Raudona (red) |
| 0 | no team → linked roles stripped |

Mapping lives in `TEAM_METADATA_VALUE`
(`packages/api/src/notifications/discord-roles.ts`). The field is registered
with type `INTEGER_EQUAL`, so each linked role uses an equality requirement.

## Flow

1. **Link** — Settings → account → "Susieti Discord" runs
   `linkSocial({ provider: "discord" })` (scopes `identify`,
   `role_connections.write`). The Discord user id lands in the existing
   `account` table (`providerId='discord'`); email/password stays the primary
   sign-in.
2. **Complete** — Discord redirects to `/settings/account?discord=linked`; the
   page fires `discord.resync` once, which backfills `user.discordUsername`
   (`GET /users/@me`) and pushes the `team` metadata.
3. **Connect (user, in Discord)** — in the server, open *Channels & Roles →
   Linked Roles → WAL GO* and connect. Discord then grants the matching team
   role and re-checks metadata periodically.
4. **Keep in sync** — any later membership change re-pushes metadata (see
   Triggers); Discord updates the granted role automatically.

## Tokens

Metadata is pushed to `PUT /users/@me/applications/{app_id}/role-connection`
with the **user's** OAuth token. Cross-season team changes happen long after
linking, so tokens are refreshed on demand via better-auth's
`auth.api.getAccessToken({ body: { providerId: "discord", userId } })` (uses the
stored refresh token). If the user hasn't linked, or the refresh fails, the sync
is a no-op.

## Reconcile core

`syncRoleConnection(db, userId)`
(`packages/api/src/notifications/discord-roles.ts`) is the single idempotent
entry point:

1. No-op if `DISCORD_CLIENT_ID` is unset or the user has no valid Discord token.
2. Look up the user's **current-season** team (`getCurrentSeason`).
3. Push `team` = the mapped value, or `0` when they have no current-season team.

Because it always recomputes, editing a *past* season's membership is naturally
a no-op. `syncRoleConnectionInBackground` wraps it for fire-and-forget use after
a committed mutation (errors logged, never thrown).

## Triggers

| Site | File |
|---|---|
| Season `join` | `packages/api/src/routers/seasons.ts` |
| Admin `addMembership` / `setMembershipTeam` / `removeMembership` | `packages/api/src/routers/admin.ts` |
| Link completion + manual resync | `discord.resync` (`packages/api/src/routers/discord.ts`) |

Automatic triggers run post-commit, best-effort. `discord.resync` is awaited so
the settings UI can surface success/failure.

## Uniqueness

One Discord identity maps to at most one WAL GO user, so a single human can't
hold two team roles. Enforced by a partial unique index
`account_discord_accountId_uq` on `account(account_id) WHERE provider_id =
'discord'`, plus a friendly `CONFLICT` in better-auth's
`databaseHooks.account.create.before`.

## Unlink

`discord.unlink` pushes `team = 0` (so Discord strips the linked roles) and
clears `user.discordUsername` **while the token still exists**, then the client
calls `authClient.unlinkAccount({ providerId: "discord" })`.

## API

`discord` router (`packages/api/src/routers/discord.ts`):

- `status` — DB-only `{ linked, discordUsername?, team? }`, no live Discord call.
- `resync` — awaited link-completion / manual re-sync, returns `{ ok }`.
- `unlink` — clears metadata + handle (see Unlink).

## Configuration

Both optional; the feature silently disables when unset (mirrors
`DISCORD_WEBHOOK_URL`).

| Var | Purpose | Binding |
|---|---|---|
| `DISCORD_CLIENT_ID` | OAuth + application id for the role-connection endpoint | Variable |
| `DISCORD_CLIENT_SECRET` | OAuth + token refresh | Secret |

Wired in `packages/env/src/server.ts`, `packages/env/env.d.ts`,
`packages/infra/alchemy.run.ts`, and mapped into `.github/workflows/deploy.yml`
`env:` (GitHub secrets/vars are **not** auto-exposed). Set in local
`apps/web/.env` for dev.

### One-time Discord setup

1. **Application** — https://discord.com/developers/applications → your app.
   Copy the **Application ID** (`DISCORD_CLIENT_ID`) and, under **OAuth2**, the
   **Client Secret** (`DISCORD_CLIENT_SECRET`).
2. **Redirect** — OAuth2 → Redirects → add
   `https://walgo.lt/api/auth/callback/discord` (and the dev URL).
3. **Linked Roles verification URL** — OAuth2 → General → set the
   *Linked Roles Verification URL* to `https://walgo.lt/settings/account`.
4. **Register the metadata schema** (one-time; needs the app's bot token from
   the **Bot** tab — the bot never joins any server):

   ```sh
   curl -X PUT \
     "https://discord.com/api/v10/applications/$DISCORD_CLIENT_ID/role-connections/metadata" \
     -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '[{"key":"team","name":"Komanda","description":"WAL GO sezono komanda","type":3}]'
   ```

5. **Configure linked roles (server admin)** — Server Settings → Linked Roles →
   create a role per team with requirement `Komanda = 1` / `= 2` / `= 3`
   (Geltona / Žalia / Raudona).

## Known limitation

Best-effort. A failed automatic sync leaves stale metadata until the next
trigger or a manual "Atnaujinti". Discord also re-evaluates linked roles on its
own cadence, so a role change may lag by minutes. Roles are cosmetic and never
affect scoring.
