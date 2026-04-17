import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: MapPage });

function MapPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Map</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          Lietuvos WAL žemėlapis
        </h1>
        <p className="mb-6 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Žaidimo lauko vieta. MapLibre su WAL kvadratais bus įterptas čia.
        </p>
        <div className="h-[480px] w-full rounded-2xl border border-dashed border-[var(--line)] bg-[var(--chip-bg)] grid place-items-center text-sm text-[var(--sea-ink-soft)]">
          Map placeholder
        </div>
      </section>
    </main>
  );
}
