# Maintenance mode

A global toggle that shows a maintenance page to all visitors while admins keep
full access. Replaces the standalone wrangler maintenance worker — it's now a
route inside the app, toggled at runtime without a deploy.

## Storage

A single-row `app_config` table holds global runtime settings
(`packages/db/src/schema/app-config.ts`). The row is keyed by a fixed id
(`APP_CONFIG_ID = 1`); `maintenance_mode` is a boolean defaulting to `false`. A
missing row is treated as "off".

## API

`packages/api/src/routers/settings.ts`:

- `settings.maintenance` (**public**) — returns `{ maintenanceMode }`. Public
  because the root route reads it on every request, including for logged-out
  visitors.
- `settings.setMaintenance` (**admin**) — upserts the flag (`onConflictDoUpdate`
  on the fixed id).

## Gating

The check lives in the root route `beforeLoad`
(`apps/web/src/routes/__root.tsx`), so it runs on every navigation (SSR +
client):

- Admins (`session.user.role === "admin"`) bypass the gate entirely — they see
  the full app so they can verify changes and toggle the flag off.
- For everyone else, when `maintenanceMode` is on, any path other than
  `/maintenance` or `/auth/*` redirects to `/maintenance`. `/auth` stays open so
  an admin can sign in while it's on.
- When `maintenanceMode` is off, `/maintenance` redirects back to `/`.

The `/maintenance` route (`apps/web/src/routes/maintenance.tsx`) renders the
Lithuanian maintenance page with a Discord link. The site `Header` returns
`null` on this path so no navigation to gated routes is shown.

## Toggling

Admin → **Nustatymai** tab (`apps/web/src/domains/admin/settings-tab.tsx`): a
switch bound to `settings.maintenance` / `settings.setMaintenance`.
