export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">About This Project</h2>
        <p className="text-sm text-zinc-600">
          A global payout orchestration demo that routes payouts across bank and stablecoin rails, executes against Mural sandbox, and keeps a full audit trail.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">What It Does</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>Accepts payout requests through a unified form.</li>
          <li>Supports rail choice: auto routing, forced bank, or forced stablecoin.</li>
          <li>Creates and executes payout requests through Mural sandbox APIs.</li>
          <li>Stores payout records, routing decisions, and raw execution response.</li>
          <li>Captures event timeline for each payout lifecycle step.</li>
          <li>Supports bulk payout batches via CSV or JSON input.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">How It Is Built</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>Frontend: Next.js App Router with server-rendered dashboard pages.</li>
          <li>API layer: route handlers under `app/api` for payouts and batches.</li>
          <li>Data layer: PostgreSQL via `pg`, with in-memory fallback when `DATABASE_URL` is missing.</li>
          <li>Execution layer: Mural API client in `lib/mural.ts` with create + execute payout flow.</li>
          <li>Routing engine: rule-based rail decisioning in `lib/routing.ts`.</li>
          <li>Event-driven traceability: lifecycle events persisted in `payout_events`.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Why This Matters</h3>
        <p className="text-sm text-zinc-700">
          Payment providers expose primitives, but most teams still need an orchestration layer for routing, resiliency, and operator visibility. This project demonstrates that application layer: policy-driven rail selection, consistent execution, and auditable outcomes.
        </p>
      </section>
    </div>
  );
}
