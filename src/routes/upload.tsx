import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upload")({ component: UploadPage });

function UploadPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in max-w-2xl rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">ADIF</p>
        <h1 className="display-title mb-5 text-3xl font-bold text-[var(--sea-ink)]">
          Upload log
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Drag-and-drop .adi / .adif file. Parser + scoring pending.
        </p>
        <div className="h-40 w-full rounded-2xl border border-dashed border-[var(--line)] bg-[var(--chip-bg)] grid place-items-center text-sm text-[var(--sea-ink-soft)]">
          Drop ADIF here
        </div>
      </section>
    </main>
  );
}
