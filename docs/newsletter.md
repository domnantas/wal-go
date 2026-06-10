# Newsletter

Branded marketing/announcement emails sent to opted-in users. Built with
`react-email`, delivered through the **Cloudflare Email Sending** binding — the
same transport the auth emails use (see [auth.md](./auth.md)). Subscription
preferences live in **our own database**; we host our own unsubscribe flow.

## Pieces

- **Templates package** — `packages/email` (`@WAL-GO/email`) holds every email
  template (newsletter + auth's reset-password / verification + shared
  `email-styles`). Pure presentational React Email components.
- **Template** — `packages/email/src/newsletter-email.tsx` (`NewsletterEmail`).
- **Transport** — `packages/email/src/lib/send.ts` (`@WAL-GO/email/lib/send`,
  `sendEmail`). Resolves the Cloudflare `EMAIL` Worker binding via a lazy
  `cloudflare:workers` import (mirroring `@WAL-GO/db`) and calls the native
  builder-form `env.EMAIL.send({ from, to, subject, html, text, headers })`.
  Outside the Worker runtime (local node dev) there is no binding, so the send
  is logged and skipped. Lives in `@WAL-GO/email` because both `@WAL-GO/auth`
  and `@WAL-GO/api` use it and `auth` can't depend on `api`.
- **Sender** — `packages/api/src/notifications/newsletter.ts`
  (`sendNewsletter`, `sendNewsletterTest`). Broadcasts load opted-in recipients,
  render the template **per recipient** with their tokenized unsubscribe URL,
  and send via `sendEmail` with one-click `List-Unsubscribe` headers. Test sends
  render once for one supplied address, use a non-destructive footer link, and
  omit bulk-mail headers.
- **Subscriptions** — `packages/api/src/notifications/subscriptions.ts` owns all
  DB access: `getSubscribedRecipients`, `getUserSubscription`,
  `setUserSubscription`, `setSubscriptionByToken`, `backfillSubscriptions`,
  `getAudienceInfo`.
- **User router** — `packages/api/src/routers/newsletter.ts` (`newsletter`,
  protected): `subscription` (read) + `setSubscription` (write) for the
  self-service opt-in toggle.
- **Unsubscribe route** — `apps/web/src/routes/unsubscribe.ts` (public, no auth).

## Data model

`newsletter_subscription` (`packages/db/src/schema/newsletter.ts`):

| column       | notes                                    |
| ------------ | ---------------------------------------- |
| `user_id`    | PK, FK → `user.id` (`on delete cascade`) |
| `subscribed` | boolean, default `true`                  |
| `updated_at` | timestamp                                |

There is **no token column** — unsubscribe links are stateless, signed tokens
(see below). A **missing row reads as subscribed** (the default for new users),
so `getUserSubscription` shows the toggle on until the user opts out. Recipients
must have a row to land in the audience:

- **Existing users** — backfilled once in the table's migration
  (`INSERT … SELECT id FROM "user"`).
- **New users** — `createAuth`'s `databaseHooks.user.create.after` inserts a row
  (`subscribed: true`), best-effort.

## Subscribers & unsubscribe (self-hosted)

The newsletter is sent to every user with `subscribed = true`. We own the
unsubscribe flow end to end:

- Each recipient's email carries a personal link
  `https://walgo.lt/unsubscribe?token=…` (the template's `unsubscribeUrl` prop)
  plus the compliant one-click headers
  `List-Unsubscribe: <…?token=…>` and
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (Gmail/Yahoo bulk rules).
- The **token is stateless**: `signUnsubscribeToken(userId)` HMAC-signs the user
  id with `BETTER_AUTH_SECRET` (`base64url(userId).base64url(sig)`). No token
  column, no DB lookup — the route recovers the user id straight from the token.
  Tokens never expire and can't be individually revoked, which is fine for an
  idempotent opt-out.
- `apps/web/src/routes/unsubscribe.ts` handles both **GET** (the link click →
  Lithuanian confirmation page) and **POST** (mailbox-provider one-click per
  RFC 8058), each calling `setSubscriptionBySignedToken(token, false)` — which
  verifies the signature before flipping the flag.
- The in-app settings toggle writes the same `subscribed` flag, so the link and
  the toggle stay consistent.

## Images

Newsletter images are **hotlinked by absolute URL**, not embedded — every
recipient's mail client fetches the image fresh on each open. So an image must
stay hosted at a stable public URL **forever**; deleting it breaks the picture
in every already-sent newsletter.

- **Storage** — a public R2 bucket (`walgo-newsletter-assets`), bound to the
  Worker as `ASSETS_BUCKET` and served from the custom domain
  **`https://assets.walgo.lt`** (declared in
  `packages/infra/alchemy.run.ts`; the domain is attached in **prod only**,
  preview deploys share the binding without a domain). Typed minimally on
  `CloudflareEnv` in `packages/env/env.d.ts`.
- **Upload** — `packages/api/src/assets/newsletter-images.ts`
  (`uploadNewsletterImage`) resolves the binding lazily via `cloudflare:workers`
  (same pattern as `@WAL-GO/db`/`sendEmail`), validates type
  (PNG/JPG/WEBP/GIF) and size (≤ 5 MB), writes the object under an **immutable
  key** (`newsletter/{uuid}.{ext}` — never overwritten or deleted, so old
  newsletters never break), and returns the `assets.walgo.lt` URL.
- **Endpoint** — `admin.newsletter.uploadImage` (admin-only) takes a `File`
  (oRPC handles the multipart upload) and returns the public URL.
- **Admin UI** — each section's image field (`newsletter-tab.tsx`,
  `SectionImageField`) uploads the picked file and fills `imageUrl` with the
  returned URL, showing a thumbnail. A manual URL input remains as a fallback.

The section `imageUrl` renders as a full-width image above the section title;
the email also accepts Markdown images inside `intro`/`body` (no width cap is
pinned for those, so prefer `imageUrl`).

## Template

`NewsletterEmail` follows the brand design from [design.md](./design.md) (warm
cream surface, rust accents, large centered logo, Markdown section bodies). The
`unsubscribeUrl` prop defaults to an inert `#` placeholder (previews only); the
sender always passes the per-recipient signed URL. See the file for the full
content shape (`label`, `heading`, `intro`, `sections`, `ctaLabel`/`ctaUrl`).

`appName` / `logoURL` default to WAL GO branding via `WALGO_NEWSLETTER_DEFAULTS`;
the Lithuanian static labels come from `WALGO_NEWSLETTER_LOCALIZATION`. The admin
preview applies the same defaults, so the preview matches the sent email (minus
the tokenized link).

## Preview

```bash
pnpm email   # opens http://localhost:3030
```

## Sending

```ts
import { sendNewsletter } from "@WAL-GO/api/notifications/newsletter";

const sent = await sendNewsletter({
  db,                                  // request db handle (context.db)
  subject: "Naujienos iš eterio – WAL GO",
  content: {
    label: "2026 sezonas · Nr. 1",
    heading: "Naujienos iš eterio",
    intro: "Sveiki!…",
    sections: [/* … */],
    localization: WALGO_NEWSLETTER_LOCALIZATION,
  },
});
```

- Renders + sends one message per opted-in recipient through the `EMAIL`
  binding, in batches of 20 (sequential batches, concurrent within a batch).
- Returns the number of messages successfully sent.

## Configuration

No newsletter-specific env vars. Transport is the Cloudflare `EMAIL` binding,
declared in `packages/infra/alchemy.run.ts`
(`SendEmail("EMAIL", { allowedSenderAddresses: ["noreply@walgo.lt", "admin@walgo.lt"] })`)
and typed on `CloudflareEnv` in `packages/env/env.d.ts`. Newsletter sender is
`WAL GO <admin@walgo.lt>` (`NEWSLETTER_FROM` in `newsletter.ts`); the
`sendEmail` default remains `WAL GO <noreply@walgo.lt>`.

Image hosting uses the public R2 bucket `ASSETS_BUCKET` on `assets.walgo.lt`
(see [Images](#images)). Alchemy creates the R2 custom-domain DNS record in the
`walgo.lt` zone; no manual setup beyond the prod deploy.

**Prerequisite:** `walgo.lt` must be onboarded for **Cloudflare Email Sending**
(Beta, Workers Paid). Until then, sends reach only verified destination
addresses, and the daily quota starts low and scales — request increases via
Cloudflare's form.

## Admin UI

The `/admin` **Naujienlaiškis** tab
(`apps/web/src/domains/admin/newsletter-tab.tsx`) drives the flow through the
`admin.newsletter` router group:

- `admin.newsletter.audience` — `{ total, subscribed }` counts from the DB for
  the header card.
- **Live preview (client-side)** — renders `NewsletterEmail` in the browser with
  the shared defaults, debounced and leniently mapped, shown in a sandboxed
  `<iframe srcDoc>`.
- `admin.newsletter.send` — validates the form (CTA label/URL together) and
  calls `sendNewsletter`; the confirmation dialog shows the subscriber count and
  the result toast shows how many were sent.
- `admin.newsletter.sendTest` — validates the same draft plus a recipient email
  and sends only to that address. The test does not clear the draft and cannot
  unsubscribe a user through its footer link.
- The admin **Users** tab shows each user's current newsletter status as
  `Prenumeruoja` or `Atsisakė`. A missing subscription row is displayed as
  subscribed, consistent with the self-service settings toggle.

## Not included

- Per-topic / category preferences (single newsletter opt-in only).
- Scheduled sends (the binding sends immediately).
