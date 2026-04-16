import { notFound } from "next/navigation";
import { getPayoutById } from "@/lib/repository";
import { StatusBadge } from "@/components/status-badge";

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPayoutById(id);
  if (!result) notFound();

  const { payout, routingLog } = result;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payout detail</h2>
        <p className="text-sm text-zinc-600">{payout.id}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Ledger record</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Recipient</dt><dd>{payout.recipient_name}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Country</dt><dd>{payout.country}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Amount</dt><dd>{payout.currency} {payout.amount.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Rail</dt><dd className="capitalize">{payout.rail}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd><StatusBadge status={payout.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Mural transaction</dt><dd>{payout.mural_transaction_id ?? "N/A"}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Routing decision</h3>
          {routingLog ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-zinc-500">Decision:</span> <span className="capitalize">{routingLog.decision}</span></p>
              <p><span className="text-zinc-500">Reason:</span> {routingLog.reason}</p>
              <p><span className="text-zinc-500">Logged at:</span> {new Date(routingLog.created_at).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No routing log found.</p>
          )}
        </div>
      </section>

    </div>
  );
}
