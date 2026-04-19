import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { requireOnboardingAuthFn, setCallsignFn } from "../server/auth";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => await requireOnboardingAuthFn(),
  component: OnboardingPage,
});

function OnboardingPage() {
  const router = useRouter();
  const [callsign, setCallsign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await setCallsignFn({ data: { callsign } });
      await router.navigate({ to: "/" });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        throw err;
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in max-w-md rounded-[2rem] px-6 py-10 sm:px-10">
        <p className="island-kicker mb-3">Sveiki atvykę</p>
        <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)]">
          Set your callsign
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Your amateur radio callsign. Uppercase letters and digits only.
          Cannot be changed later.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            placeholder="e.g. LY1AB"
            maxLength={10}
            required
            className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-4 py-2.5 text-sm font-mono text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)] focus:ring-1 focus:ring-[var(--lagoon-deep)]"
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving || callsign.length < 3}
            className="rounded-xl bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save callsign"}
          </button>
        </form>
      </section>
    </main>
  );
}
