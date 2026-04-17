import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in max-w-md rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">Registruotis</p>
        <h1 className="display-title mb-5 text-3xl font-bold text-[var(--sea-ink)]">
          Sign up
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Email + callsign form pending Clerk integration.
        </p>
      </section>
    </main>
  );
}
