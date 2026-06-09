# Authentication

WAL GO uses Better Auth. The session is stored in cookies; the server reads it from each request's `headers`.

## Responsibilities

| Layer | Purpose |
|---|---|
| Better Auth (`/api/auth/*`) | Sign-in/out, session management, account actions. |
| Router context | SSR state + navigation protection. A convenience layer, **not** the final security boundary. |
| ORPC context | The authoritative API authorization source. Every request reads the session from headers. |
| `protectedProcedure` | Rejects API actions when `context.session.user` is missing. |
| Better Auth UI hooks | Client-side account state and revalidation after hydration. |

## Router context

The root route and every protected route call `getUser()` in `beforeLoad` and store the session in route context. This enables correct SSR header navigation (no logged-out flash), pre-render redirects on protected pages, and skipping protected queries when signed out.

Router context is **not** the only authorization source — the client can be stale after sign-out/expiry. All sensitive actions must use server-side checks via ORPC `protectedProcedure`.

## SSR session hydration

The root and protected `beforeLoad` handlers call `getUser()` (a direct `auth.api.getSession`, no HTTP round-trip), then write the result into the Query cache:

```ts
queryClient.setQueryData(sessionOptions(authClient).queryKey, session)
```

This populates `["auth", "getSession"]` before the tree renders. `@better-auth-ui/react` components/hooks (`Settings`, `Auth` forms, `useSession(authClient)`) share that key via `sessionOptions`, so they hydrate from cache instead of refetching.

### No log-in flash in the header

`Header` and `UserButton` read the session with `useSession(authClient)` from `@better-auth-ui/react` (the shared TanStack Query hook), **not** Better Auth's own `authClient.useSession()` (a separate nanostore hook that ignores the query cache). Because root `beforeLoad` seeds `["auth", "getSession"]` during SSR, `useSession` has the real session on first server and hydrated client render, so the header never flashes "Prisijungti" for an authenticated user.

### Per-request QueryClient (security)

The `QueryClient` is created **per request** via `makeQueryClient()` inside `getRouter()` (`apps/web/src/router.tsx`), never as a module singleton. On the server (Workers reuse isolate globals across requests) a shared client would let one user's SSR-seeded session dehydrate into another's HTML — a cross-user leak. `AuthProvider` gets no explicit `queryClient` prop; it inherits the per-request instance from the `QueryClientProvider` the router installs, so the seeded cache and its readers share one client.

## Practical rule

- Signed-in-only pages need a route `beforeLoad` check against `context.session?.user`.
- Admin-only pages must additionally check `session.user.role === "admin"` and redirect to `/` otherwise.
- API procedures returning/mutating user data must be `protectedProcedure`.
- Client `useSession()` / `useAuthenticate()` improve UX but must not replace server-side authorization.

## Admin role

The `admin` Better Auth plugin adds a `role` field (`"user"` | `"admin"`). `/admin` enforces it in `beforeLoad`: no session → `/auth/sign-in`; `role !== "admin"` → `/`; admin → renders. Role is set via the admin API (`authClient.admin.setRole()`) — no UI yet, so done directly through API or DB.

### Two-layer protection

`beforeLoad` protects the page UI (SSR + client navigation), but server functions and ORPC procedures can be called directly via HTTP, bypassing `beforeLoad`. Any admin-only endpoint must use `adminProcedure` (`packages/api/src/index.ts`), which independently enforces `role === "admin"` and throws `FORBIDDEN`.

## Email verification

Required (`requireEmailVerification: true`). On sign-up, Better Auth sends a verification email via Resend (`noreply@walgo.lt`); the user must click the link before signing in. The `sendVerificationEmail` callback lives in `emailVerification` (not `emailAndPassword`) in `packages/auth/src/index.ts`, using `RESEND_API_KEY`, which must be set in:

- Local dev: `apps/web/.env` (`RESEND_API_KEY=re_...`).
- Cloudflare (prod/preview): Alchemy `Secret("RESEND_API_KEY")` in `packages/infra/alchemy.run.ts`; set via `alchemy secret set RESEND_API_KEY` or the Cloudflare dashboard.

Keep `requireEmailVerification` in sync between the server config and `AuthProvider` (`apps/web/src/components/providers.tsx`).

## Password reset

Fully wired:

- UI routes `/auth/forgot-password` and `/auth/reset-password` (the `Auth` component in `packages/ui`).
- `sendResetPassword` callback in `emailAndPassword` sends a Lithuanian reset email via Resend.
- Template: `ResetPasswordEmail` (`packages/email/src/reset-password-email.tsx`). Email templates live in the `@WAL-GO/email` package (see [newsletter.md](./newsletter.md) for the preview server); `packages/auth` imports them and does its own Resend send.
- Links expire in 60 minutes. The link lands on `/auth/reset-password?token=<token>`; the UI reads the token and calls Better Auth's `/reset-password`.

## Password visibility toggle

All password inputs have a show/hide eye button (`Eye`/`EyeOff` from `lucide-react`) rendered as an `InputGroupButton` in an inline-end `InputGroupAddon`. Local `useState` per field flips the input `type` between `"text"` and `"password"`. The button uses `localization.auth.showPassword` / `hidePassword` for `aria-label` and `title`.

Covers: sign-in (`sign-in.tsx`), sign-up + confirm (`sign-up.tsx`), change-password current + new + confirm (`settings/security/change-password.tsx`), reset-password + confirm (`reset-password.tsx`). Email fields stay plain `Input`.

## Rate limiting

Better Auth's built-in rate limiting is enabled with `storage: "database"` so state persists across Workers isolates (in-memory is per-isolate). Stored in the `rate_limit` table (`packages/db/src/schema/auth.ts`). Built-in rules (per IP):

| Path pattern | Window | Max |
|---|---|---|
| `/sign-in/*`, `/sign-up/*`, `/change-password/*`, `/change-email/*` | 10s | 3 |
| Everything else | 10s | 100 |

These cover the highest-risk vectors (credential stuffing, email bombing). Custom rules via `rateLimit.customRules`.

## @better-auth-ui/react compatibility

UI components (`packages/ui`) target `@better-auth-ui/react` v1.6.14, which introduced breaking changes:

- All hooks require `authClient` first: `useSession(authClient)`, `useListSessions(authClient)`, etc.
- Feature flags moved from `AuthConfig` fields to plugin instances (`themePlugin`, `usernamePlugin`, `deleteUserPlugin`, …).
- Plugin localization keys via `useAuthPlugin(factory)` or cast `(localization.auth as Record<string, string>).key`.
- `getProviderName` and `AuthView` import from `@better-auth-ui/core` (not `/react/core`).
- `useListUserPasskeys` renamed to `useListPasskeys`.
- The `Link` prop is removed from `AuthConfig` — use `<a href="...">`.
