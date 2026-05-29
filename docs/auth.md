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

The root route does not perform a server-side session lookup. The homepage route disables SSR and public pages render with `session: null` during the shell render, then the header refreshes auth state on the client through Better Auth hooks. Protected routes call the `getUser()` server function in their own `beforeLoad` handlers and store the session in route context. This allows:

- Correct header navigation during SSR.
- Protected pages to redirect before the component renders.
- Protected queries/mutations to be avoided when the user is not signed in.

Router context must not be treated as the only authorization source, because the client can have stale state after sign-out or session expiry. All sensitive actions must use server-side checks through ORPC `protectedProcedure`.

## SSR session hydration

Protected route `beforeLoad` handlers call `getUser()` (a direct `auth.api.getSession` call — no HTTP round-trip) and then write the result into the TanStack Query cache:

```ts
queryClient.setQueryData(sessionOptions(authClient).queryKey, session)
```

This populates the `["auth", "getSession"]` cache key before the component tree renders. `@better-auth-ui/react` components (`Settings`, `Auth` forms, `UserButton`) share the same key via `sessionOptions`, so they hydrate from cache on first render instead of making an extra network request. The root `loader` reads back the cached session via `queryClient.getQueryData(sessionOptions(authClient).queryKey)` so the `Header` also has the session value during SSR.

## Practical rule

- Pages intended only for signed-in users must have a route `beforeLoad` check against `context.session?.user`.
- API procedures that return or mutate user data must be `protectedProcedure`.
- Client-side `useSession()` / `useAuthenticate()` hooks can improve UX, but must not replace server-side authorization.

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

## @better-auth-ui/react compatibility

The UI components (`packages/ui`) target `@better-auth-ui/react` v1.6.14, which introduced breaking changes:

- All hooks require `authClient` as first argument: `useSession(authClient)`, `useListSessions(authClient)`, etc.
- Feature flags moved from `AuthConfig` fields to plugin instances (`themePlugin`, `usernamePlugin`, `deleteUserPlugin`, etc.)
- Plugin-specific localization keys are accessed via `useAuthPlugin(factory)` or cast as `(localization.auth as Record<string, string>).key`
- `getProviderName` and `AuthView` are imported from `@better-auth-ui/core` (not the `/react/core` subpath)
- `useListUserPasskeys` was renamed to `useListPasskeys`
- The `Link` prop is removed from `AuthConfig` — use `<a href="...">` directly
