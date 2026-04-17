import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/seasons")({
  component: AdminSeasonsPage,
});

function AdminSeasonsPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">Admin</p>
        <h1 className="display-title mb-5 text-3xl font-bold text-[var(--sea-ink)]">
          Seasons
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Create / edit / delete seasons. Overlap prevention enforced.
        </p>
      </section>
    </main>
  );
}
