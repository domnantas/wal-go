# Authentication

WAL GO uses Better Auth. The session is stored in cookies, and the server reads it from each request's `headers`.

## Responsibilities

| Layer | Purpose |
| --- | --- |
| Better Auth (`/api/auth/*`) | Sign-in, sign-out, session management, and user account actions. |
| Router context | SSR state and navigation protection. This is a convenience layer, not the final security boundary. |
| ORPC context | The authoritative API authorization source. Every API request reads the session from request headers. |
| `protectedProcedure` | Rejects API actions when `context.session.user` is missing. |
| Better Auth UI hooks | Client-side account state and revalidation after hydration. |

## Router context

Both the root route and every protected route call the `getUser()` server function in `beforeLoad` and store the session in route context. This allows:

- Correct header navigation during SSR (no logged-out flash — see below).
- Protected pages to redirect before the component renders.
- Protected queries/mutations to be avoided when the user is not signed in.

Router context must not be treated as the only authorization source, because the client can have stale state after sign-out or session expiry. All sensitive actions must use server-side checks through ORPC `protectedProcedure`.

## SSR session hydration

The root route and protected route `beforeLoad` handlers call `getUser()` (a direct `auth.api.getSession` call — no HTTP round-trip) and then write the result into the TanStack Query cache:

```ts
queryClient.setQueryData(sessionOptions(authClient).queryKey, session)
```

This populates the `["auth", "getSession"]` cache key before the component tree renders. `@better-auth-ui/react` components and hooks (`Settings`, `Auth` forms, and `useSession(authClient)`) share the same key via `sessionOptions`, so they hydrate from cache on first render instead of making an extra network request.

### No log-in flash in the header

`Header` and `UserButton` read the session with `useSession(authClient)` from `@better-auth-ui/react` (the shared TanStack Query hook), **not** Better Auth's own `authClient.useSession()` (a separate nanostore-backed hook that does not read the query cache). Because the root `beforeLoad` seeds `["auth", "getSession"]` during SSR, `useSession` has the real session on the first server and hydrated client render, so the header never briefly paints the "Prisijungti" (log in) button for an authenticated user.

### Per-request QueryClient (security)

The `QueryClient` is created **per request** via `makeQueryClient()` inside `getRouter()` (`apps/web/src/router.tsx`) — never as a module-level singleton. On the server (Cloudflare Workers reuse isolate globals across requests) a shared client would let one user's SSR-seeded session dehydrate into another user's HTML — a cross-user session leak. `AuthProvider` does not receive an explicit `queryClient` prop; it inherits the same per-request instance from the `QueryClientProvider` that the router's SSR-query integration installs, so the seeded cache and the components reading it always share one client.

## Practical rule

- Pages intended only for signed-in users must have a route `beforeLoad` check against `context.session?.user`.
- Pages intended only for admins must additionally check `session.user.role === "admin"` and redirect to `/` if the role doesn't match.
- API procedures that return or mutate user data must be `protectedProcedure`.
- Client-side `useSession()` / `useAuthenticate()` hooks can improve UX, but must not replace server-side authorization.

## Admin role

The `admin` Better Auth plugin adds a `role` field (`"user"` | `"admin"`) to the user record. The `/admin` route enforces this at the router level in `beforeLoad`:

1. No session → redirect to `/auth/sign-in`
2. Session with `role !== "admin"` → redirect to `/`
3. Admin session → route renders

The role is set via the Better Auth admin API (e.g. `authClient.admin.setRole()`). There is no UI for this yet; it must be done directly through the API or database.

### Two-layer protection

`beforeLoad` protects the page UI (runs server-side on SSR, client-side on navigation), but server functions and ORPC procedures can be called directly via HTTP — they bypass `beforeLoad` entirely. Any admin-only API endpoint must use `adminProcedure` from `packages/api/src/index.ts`, which independently enforces `role === "admin"` and throws `FORBIDDEN` otherwise.

## Email verification

Email verification is required (`requireEmailVerification: true`). On sign-up, Better Auth sends a verification email via Resend (`noreply@walgo.lt`). The user must click the link before they can sign in.

The `sendVerificationEmail` callback lives in `emailVerification` (not `emailAndPassword`) in `packages/auth/src/index.ts`. It uses the `RESEND_API_KEY` secret, which must be set in:

- Local dev: `apps/web/.env` as `RESEND_API_KEY=re_...`
- Cloudflare (prod/preview): Alchemy `Secret("RESEND_API_KEY")` in `packages/infra/alchemy.run.ts`; add the value via `alchemy secret set RESEND_API_KEY` or the Cloudflare dashboard

The `requireEmailVerification` flag must be kept in sync between the server config and the `AuthProvider` in `apps/web/src/components/providers.tsx`.

## Password reset

Forgot/reset password flow is fully wired up:

- UI routes: `/auth/forgot-password` and `/auth/reset-password` (handled by the `Auth` component in `packages/ui`)
- `sendResetPassword` callback in `emailAndPassword` in `packages/auth/src/index.ts` sends a Lithuanian-localised reset email via Resend
- Email template: `ResetPasswordEmail` in `packages/ui/src/components/auth/email/reset-password-email.tsx`
- Reset links expire in 60 minutes

The reset link lands on `/auth/reset-password?token=<token>`. The UI reads the token from the URL and calls Better Auth's `/reset-password` endpoint.

## Rate limiting

Better Auth's built-in rate limiting is enabled with `storage: "database"` so state persists across Cloudflare Workers isolates (in-memory storage is per-isolate and does not survive request distribution).

The rate limit state is stored in the `rate_limit` table (`packages/db/src/schema/auth.ts`).

Built-in special rules (applied per IP):

| Path pattern | Window | Max |
| --- | --- | --- |
| `/sign-in/*`, `/sign-up/*`, `/change-password/*`, `/change-email/*` | 10s | 3 |
| Everything else | 10s | 100 |

These defaults are set by Better Auth and cover the highest-risk vectors (credential stuffing, email bombing). Custom rules can be added via `rateLimit.customRules` in `packages/auth/src/index.ts`.

## @better-auth-ui/react compatibility

The UI components (`packages/ui`) target `@better-auth-ui/react` v1.6.14, which introduced breaking changes:

- All hooks require `authClient` as first argument: `useSession(authClient)`, `useListSessions(authClient)`, etc.
- Feature flags moved from `AuthConfig` fields to plugin instances (`themePlugin`, `usernamePlugin`, `deleteUserPlugin`, etc.)
- Plugin-specific localization keys are accessed via `useAuthPlugin(factory)` or cast as `(localization.auth as Record<string, string>).key`
- `getProviderName` and `AuthView` are imported from `@better-auth-ui/core` (not the `/react/core` subpath)
- `useListUserPasskeys` was renamed to `useListPasskeys`
- The `Link` prop is removed from `AuthConfig` — use `<a href="...">` directly
