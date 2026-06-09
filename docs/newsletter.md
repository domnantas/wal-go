# Newsletter

Branded marketing/announcement emails sent to opted-in users via Resend. Built
with `react-email`, reusing the same rendering + delivery setup as the auth
emails (see [auth.md](./auth.md)).

## Pieces

- **Templates package** — `packages/email` (`@WAL-GO/email`) holds every email
  template (newsletter + auth's reset-password / verification + shared
  `email-styles`). Pure presentational React Email components, no Resend.
- **Template** — `packages/email/src/newsletter-email.tsx` (`NewsletterEmail`).
- **Sender** — `packages/api/src/notifications/newsletter.ts`
  (`sendNewsletter`). Renders the template per recipient and posts to Resend's
  batch endpoint. Auth keeps its own Resend send (see [auth.md](./auth.md)) —
  delivery lives with each consumer, the package stays template-only.

## Preview

The `@WAL-GO/email` package ships the React Email dev server:

```bash
pnpm -F @WAL-GO/email email   # opens http://localhost:3030
```

It renders every template's default export using its `PreviewProps` (the
newsletter ships Lithuanian sample content). The build cache lands in
`packages/email/.react-email` (gitignored).

## Template

`NewsletterEmail` follows the brand design from [design.md](./design.md):

- Warm cream surface with dark-brown ink, tuned to the WAL GO logo
  (`WARM_SURFACE`, passed as the default `colors`). The neutral `defaultColors`
  in `email-styles` stay reserved for the transactional auth emails.
- WAL GO logo centered and large (128px) at the top of a rounded card.
- Rust accents for the issue label and section "read more" links; a solid
  brown CTA button with white text.
- Sections render as plain text blocks, or — when a section has an `imageUrl` —
  as a feature row with a 96px rounded thumbnail beside the text.
- Surfaces (background / card / border / muted text) flow through `EmailStyles`,
  so light/dark mode is handled consistently with the auth emails.

Email clients can't read the app's `oklch` design tokens, so the brand accents
are pinned as static sRGB hex (`BRAND` constant) mirroring `--brand-*` in
`packages/ui/src/styles/globals.css`. Brand accents stay constant across
light/dark by design — identity should look the same in every inbox.

### Content shape

```tsx
<NewsletterEmail
  label="2026 sezonas · Nr. 1"        // optional kicker above the headline
  heading="Naujienos iš eterio"        // required
  intro="Sveiki! Štai kas naujo…"      // optional lead paragraph
  sections={[                          // optional content blocks
    // imageUrl is optional — present → feature row with a thumbnail
    { title: "…", body: "…", imageUrl: "https://walgo.lt/og.png", url: "https://walgo.lt/map", linkLabel: "Žiūrėti" },
  ]}
  ctaLabel="Registruoti ryšį"          // optional primary button
  ctaUrl="https://walgo.lt"
  unsubscribeUrl="https://walgo.lt/unsubscribe?token=…"  // required
/>
```

`NewsletterEmail.PreviewProps` holds sample Lithuanian content for previewing
in the React Email dev server / VS Code preview.

UI copy is Lithuanian. The template's static labels default to English and are
overridable through the `localization` prop — set them when sending (see
below).

## Sending

```ts
import { sendNewsletter } from "@WAL-GO/api/notifications/newsletter";

await sendNewsletter({
  subject: "Naujienos iš eterio – WAL GO",
  recipients: [
    { email: "ham@example.com", unsubscribeUrl: "https://walgo.lt/unsubscribe?token=abc" },
  ],
  content: {
    label: "2026 sezonas · Nr. 1",
    heading: "Naujienos iš eterio",
    intro: "Sveiki!…",
    sections: [/* … */],
    localization: {
      READ_MORE: "Skaityti plačiau",
      UNSUBSCRIBE: "Atsisakyti prenumeratos",
      VIEW_ONLINE: "Žiūrėti naršyklėje",
      EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
    },
  },
});
```

- `appName` and `logoURL` default to WAL GO branding / `walgo.lt/logo_512.png`;
  override via `content` if needed. That logo is served from
  `apps/web/public/logo_512.png` (a copy of the bundled header asset) — email
  clients need an absolute, publicly reachable URL, so the logo must live in
  `public/`, not only as a Vite-imported asset.
- Each recipient gets their own `unsubscribeUrl`, rendered into the footer link
  and the `List-Unsubscribe` / `List-Unsubscribe-Post` headers (one-click
  unsubscribe + spam compliance).
- Recipients are chunked into batches of 50 (Resend's per-call limit) and sent
  through `resend.batch.send`.
- Returns the number of messages handed to Resend.

## Configuration

Reuses `RESEND_API_KEY` (see [auth.md](./auth.md) / `packages/env`). Sender
address is `WAL GO <noreply@walgo.lt>`. No new env vars.

## Not included

- Subscriber storage / opt-in management and unsubscribe-token generation are
  the caller's responsibility — `sendNewsletter` only renders and delivers.
