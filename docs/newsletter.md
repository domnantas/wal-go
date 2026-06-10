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
  (`sendNewsletter`). Renders the template once (via the shared
  `renderNewsletter` helper) and posts it as a Resend Broadcast to the audience
  (see Subscribers & unsubscribe below). Auth keeps its own Resend send (see
  [auth.md](./auth.md)) — delivery lives with each consumer, the `@WAL-GO/email`
  package stays template-only.
- **Shared content constants** — `WALGO_NEWSLETTER_DEFAULTS` (brand
  `appName` / `logoURL`) and `WALGO_NEWSLETTER_LOCALIZATION` (Lithuanian
  overrides for the template's English static labels) are exported from
  `newsletter-email.tsx`. The send path and the admin preview both apply them,
  so the preview matches the sent email exactly.
- **Contacts** — `packages/api/src/notifications/contacts.ts` backfills the
  segment (`syncAllContacts`) and reads/writes a single user's subscription
  (`getUserSubscription` / `setUserSubscription`).
- **User router** — `packages/api/src/routers/newsletter.ts` (`newsletter`,
  protected): `subscription` (read) + `setSubscription` (write) for the
  self-service opt-in toggle.

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
  (`WARM_SURFACE`, passed as the default `colors`). `WARM_SURFACE` and the
  `BRAND` accents live in `email-styles` and are shared by all three templates
  (newsletter + reset-password + verification), so the transactional auth
  emails match the newsletter. The neutral `defaultColors` stay as the
  `EmailStyles` fallback only.
- WAL GO logo centered and large (128px) at the top of a rounded card.
- Rust accents for the issue label and section "read more" links; a solid
  brown CTA button with white text.
- Section bodies and the intro are **Markdown** (rendered with `<Markdown>` from
  `@react-email/components`), so they support paragraphs, lists, bold/italic and
  links. Email clients drop the surrounding Tailwind classes on the generated
  tags, so spacing / lists / the rust link accent are pinned via the
  `MARKDOWN_STYLES` inline styles in `newsletter-email.tsx`. Section titles and
  the CTA stay plain text.
- When a section has an `imageUrl`, a full-width rounded image sits on top of the
  heading and body.
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
  intro="Sveiki! Štai kas naujo…"      // optional lead paragraph (Markdown)
  sections={[                          // optional content blocks
    // body is Markdown — paragraphs, lists, **bold**, [links](…)
    // imageUrl is optional — present → full-width image on top of the section
    { title: "…", body: "- punktas\n- punktas", imageUrl: "https://walgo.lt/og.png", url: "https://walgo.lt/map", linkLabel: "Žiūrėti" },
  ]}
  ctaLabel="Registruoti ryšį"          // optional primary button
  ctaUrl="https://walgo.lt"
  // unsubscribeUrl is optional — defaults to the {{{RESEND_UNSUBSCRIBE_URL}}}
  // merge tag; sendNewsletter relies on that default (see Subscribers below)
/>
```

`NewsletterEmail.PreviewProps` holds sample Lithuanian content for previewing
in the React Email dev server / VS Code preview.

UI copy is Lithuanian. The template's static labels default to English and are
overridable through the `localization` prop — set them when sending (see
below).

## Subscribers & unsubscribe (Resend Segments)

> Resend renamed **Audiences → Segments**; contacts are now global and belong to
> zero or more segments. We target one segment (`RESEND_SEGMENT_ID`). The older
> `audienceId` API fields still work as deprecated aliases, but the code uses the
> current `segmentId` / `segments: [{ id }]` form.

Subscribers are contacts in a **Resend Segment**, and the newsletter is sent as
a Resend **Broadcast** to that segment. Resend owns the entire unsubscribe flow
— we don't host an unsubscribe page or store opt-out state:

- The template's footer link defaults to the `{{{RESEND_UNSUBSCRIBE_URL}}}`
  merge tag. Resend replaces it per contact at send time, hosts the unsubscribe
  page, and flips that contact's `unsubscribed` flag.
- Resend injects the compliant one-click `List-Unsubscribe` /
  `List-Unsubscribe-Post` headers automatically for broadcasts (Gmail/Yahoo
  bulk requirements).
- Already-unsubscribed contacts are skipped by Resend on the next broadcast.

This only works for segment broadcasts — plain `emails.send` / `batch.send`
would require us to host the page and manage state ourselves, which is why the
old per-recipient sender's `walgo.lt/unsubscribe?token=…` URL never worked.

### Creating the segment

New Resend accounts expose this under **Segments** (not Audiences), and may only
allow creating one via the API:

```bash
curl -s -X POST https://api.resend.com/segments \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"WAL GO"}'
```

The returned `id` is the value for `RESEND_SEGMENT_ID`.

### User opt-in toggle (settings)

The account settings screen shows a **Naujienlaiškis** card
(`apps/web/src/domains/settings/newsletter-settings.tsx`), rendered by the
settings route alongside the packaged `<Settings>` (the `@WAL-GO/ui` settings
component has no API access, so the card lives in the app). It is backed by the
protected `newsletter` router and **stores no state in our DB** — Resend's
contact `unsubscribed` flag is the single source of truth:

- `newsletter.subscription` → `getUserSubscription(email)` reads the contact;
  missing contact or unset segment reads as not subscribed.
- `newsletter.setSubscription({ subscribed })` → `setUserSubscription` updates
  the contact's `unsubscribed` flag. Receiving the broadcast needs both segment
  membership and `unsubscribed: false`, so opting in also ensures the contact is
  in the segment (idempotent `contacts.segments.add`) — covering a contact that
  exists outside it — and creates the contact in the segment if it doesn't exist
  yet. Opting out of a non-existent contact is a no-op.

This is the same `unsubscribed` flag Resend's hosted unsubscribe page flips, so
the in-app toggle and the email unsubscribe link stay consistent automatically.
The card hides itself when `RESEND_SEGMENT_ID` is unset.

### Keeping the segment populated

- **On sign-up** — `createAuth`'s `databaseHooks.user.create.after` adds the new
  user as a contact via `resend.contacts.create({ …, segments: [{ id }] })`.
  Best-effort and wrapped in try/catch: a Resend failure never blocks sign-up.
- **Backfill / reconciliation** — `syncAllContacts()`
  (`packages/api/src/notifications/contacts.ts`) lists the segment's existing
  contacts, then creates one for every user not already present. It never
  re-creates an existing contact, so anyone who unsubscribed stays
  unsubscribed.

## Sending

```ts
import { sendNewsletter } from "@WAL-GO/api/notifications/newsletter";

const broadcastId = await sendNewsletter({
  subject: "Naujienos iš eterio – WAL GO",
  // scheduledAt: "in 1 hour",        // optional; omit to send immediately
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

- Sends to the whole `RESEND_SEGMENT_ID` segment — there is no `recipients`
  list and no per-recipient `unsubscribeUrl` (Resend handles it).
- `appName` and `logoURL` default to WAL GO branding / `walgo.lt/logo_512.png`;
  override via `content` if needed. That logo is served from
  `apps/web/public/logo_512.png` (a copy of the bundled header asset) — email
  clients need an absolute, publicly reachable URL, so the logo must live in
  `public/`, not only as a Vite-imported asset.
- The newsletter is rendered once to HTML and posted via
  `resend.broadcasts.create({ …, send: true })`. Returns the Resend broadcast
  id.

## Configuration

Reuses `RESEND_API_KEY` (see [auth.md](./auth.md) / `packages/env`) and adds
`RESEND_SEGMENT_ID` (the target segment — see "Creating the segment" above).
`sendNewsletter` throws if it is unset; the sign-up contact hook silently skips.
Sender address is `WAL GO <noreply@walgo.lt>`.

## Admin UI

The `/admin` **Naujienlaiškis** tab (`apps/web/src/domains/admin/newsletter-tab.tsx`)
drives the whole flow through the `admin.newsletter` router group:

- `admin.newsletter.audience` — segment summary (configured?, total /
  subscribed / unsubscribed counts) for the header card. Returns
  `configured: false` when `RESEND_SEGMENT_ID` is unset instead of erroring.
- `admin.newsletter.syncContacts` — runs `syncAllContacts()`; toasts the number
  of contacts created.
- **Live preview (client-side)** — the tab renders `NewsletterEmail` in the
  browser with `render` from `@react-email/components`, applying the shared
  `WALGO_NEWSLETTER_DEFAULTS` / `WALGO_NEWSLETTER_LOCALIZATION`. The form state
  is debounced (400ms), leniently mapped (empty sections dropped, placeholder
  heading, CTA label/URL required together), then rendered to HTML and shown in
  a sandboxed full-width `<iframe srcDoc>` below the form. No server round-trip —
  `/admin` is admin-only and TanStack Start code-splits it into its own chunk,
  so `@react-email/render` ships only in that chunk and never bloats the bundle
  regular users download.
- `admin.newsletter.send` — validates the form (CTA label/URL must be set
  together) and calls `sendNewsletter`. Lithuanian static labels are injected
  server-side, so the form only collects content. Sending is gated behind a
  confirmation dialog that shows the subscriber count, since it dispatches real
  email and can't be undone.

## Not included

- Removing contacts from the audience on account deletion.
