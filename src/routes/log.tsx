import { createFileRoute } from "@tanstack/react-router";
import { requireAuthFn } from "../server/auth";

export const Route = createFileRoute("/log")({
  beforeLoad: async () => await requireAuthFn(),
  component: LogPage,
});

function LogPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">Žurnalas</p>
        <h1 className="display-title mb-5 text-3xl font-bold text-[var(--sea-ink)]">
          QSO log
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Pagination + CRUD pending. Lists user QSOs for active season.
        </p>
      </section>
    </main>
  );
}
