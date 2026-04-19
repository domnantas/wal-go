import { createFileRoute } from "@tanstack/react-router";
import { requireAuthFn } from "../server/auth";

export const Route = createFileRoute("/join-season")({
  beforeLoad: async () => await requireAuthFn(),
  component: JoinSeasonPage,
});

function JoinSeasonPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in max-w-xl rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">Sezonas</p>
        <h1 className="display-title mb-5 text-3xl font-bold text-[var(--sea-ink)]">
          Spin roulette
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Team roulette (yellow / green / red). One spin, permanent assignment.
        </p>
        <div className="flex gap-3">
          <span className="inline-block h-8 w-8 rounded-full bg-yellow-400" />
          <span className="inline-block h-8 w-8 rounded-full bg-green-500" />
          <span className="inline-block h-8 w-8 rounded-full bg-red-500" />
        </div>
      </section>
    </main>
  );
}
