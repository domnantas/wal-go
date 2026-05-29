# Admin

The `/admin` route is a protected management UI accessible only to users with `role = "admin"`.

## Access control

Two layers enforce admin-only access:

- **Route guard** (`beforeLoad` in `apps/web/src/routes/admin.tsx`): redirects to sign-in if unauthenticated, redirects to `/` if role is not `"admin"`.
- **API procedures** (`adminProcedure` in `packages/api/src/index.ts`): every admin endpoint independently verifies `role === "admin"` server-side and throws `FORBIDDEN` otherwise. This protects against direct HTTP calls that bypass the route guard.

## Features

### Users tab

- List all registered users (callsign, email, role, banned status)
- Toggle role between `user` and `admin`
- Ban / unban a user (ban requires confirmation dialog)

Implemented via `orpc.admin.users.*` procedures in `packages/api/src/routers/admin.ts`.

### Seasons tab

- List all seasons with name, dates, and derived status (`upcoming` / `active` / `ended`)
- Create a new season (name + start/end datetime)
- Edit an existing season
- Delete a season with confirmation (cascades to all memberships and QSOs)

Implemented via `orpc.admin.seasons.*` procedures in `packages/api/src/routers/admin.ts`.

## Granting admin role

There is no UI for the initial admin grant. Set `role = 'admin'` directly in the database, or use the Better Auth admin API (`authClient.admin.setRole()`). Once one admin exists, they can promote others through the admin UI.
