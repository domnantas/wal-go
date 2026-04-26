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

The root route `beforeLoad` calls the `getUser()` server function and stores the session in router context. This allows:

- Correct header navigation during SSR.
- Protected pages to redirect before the component renders.
- Protected queries/mutations to be avoided when the user is not signed in.

Router context must not be treated as the only authorization source, because the client can have stale state after sign-out or session expiry. All sensitive actions must use server-side checks through ORPC `protectedProcedure`.

## Practical rule

- Pages intended only for signed-in users must have a route `beforeLoad` check against `context.session?.user`.
- API procedures that return or mutate user data must be `protectedProcedure`.
- Client-side `useSession()` / `useAuthenticate()` hooks can improve UX, but must not replace server-side authorization.

## Email verification

Email verification is currently not required (`requireEmailVerification: false`). If it is enabled on the server later, the same value must also be aligned in the Better Auth UI configuration.
