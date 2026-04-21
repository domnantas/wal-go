# WAL GO

Lithuanian amateur radio territory competition web app.

## Tech Stack

- **Framework**: TanStack Start (React, file-based routing via TanStack Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style, neutral base)
- **Auth**: Neon Auth SDK (`@neondatabase/neon-js/auth`) + better-auth-ui shadcn components
- **UI Components**: shadcn/ui (Radix primitives) — installed via `npx shadcn@latest add`
- **Database**: Neon Postgres via Drizzle ORM
- **Language**: TypeScript

## Styling Rules

- **Tailwind only.** No inline styles, no custom CSS classes.
- The only exception for inline `style={}` is truly dynamic values computed from data (e.g. progress bar width from a percentage).
- Two theme systems coexist in `src/styles.css`:
  - **shadcn/ui vars** (`:root`): `--background`, `--foreground`, `--primary`, `--border`, etc. — mapped to WAL GO palette. Used by shadcn components.
  - **WAL GO tokens** (`@theme`): `--color-cream`, `--color-brown2`, `--shadow-card`, etc. — app-specific colors not in shadcn.
- Use `bg-cream`, `text-brown2` for app layout; shadcn components use `bg-background`, `text-foreground` etc. automatically.
- `src/styles.css` contains: font imports, Tailwind + shadcn directives, theme tokens, base layer, and keyframes. No component CSS.
- Fonts: `font-sans` = DM Sans, `font-serif` = Lora. Headings use `font-serif` explicitly.
- New shadcn components: `npx shadcn@latest add <component>`. Config in `components.json`.

## Design System Colors

| Token | Utility | Hex |
|-------|---------|-----|
| cream/cream2/cream3 | `bg-cream`, `bg-cream2`, `bg-cream3` | #faf7f2, #f3ede3, #eae0d0 |
| brown/brown2/brown3 | `text-brown`, `text-brown2`, `text-brown3` | #1c1007, #5c4a30, #8a7460 |
| border | `border-border` | #ddd3c0 |
| accent | `text-accent` | #7c5cf0 |
| yellow/green/red | Team colors with `-bg` and `-dark` variants |
| sea/land | Map colors |

## Auth

- Auth client: `src/lib/auth.ts` — Neon `createAuthClient` with `BetterAuthReactAdapter`
- Auth provider: `src/components/providers.tsx` — wraps app with `AuthProvider` from better-auth-ui
- Auth UI: `src/components/auth/` — shadcn-based components from `better-auth-ui.com/r/auth.json`
- User button: `src/components/user/user-button.tsx` — dropdown with avatar, sign-out
- Route protection: `useAuthenticate()` from `@better-auth-ui/react` — redirects to sign-in, returns `{ data: { session, user } }`
- Auth routes: `/auth/$pathname` with valid paths from `viewPaths.auth` (sign-in, sign-up, sign-out, forgot-password, etc.)

## Routing

- TanStack Router with typed routes. Dynamic segments use `$param` syntax.
- Link to dynamic routes: `<Link to="/auth/$pathname" params={{ pathname: "sign-in" }} />`
- Active links get `data-status="active"`. Style with `data-[status=active]:` Tailwind modifier.

## Language

UI text is in Lithuanian.

---

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
