import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayoutBatchById } from "@/lib/repository";

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPayoutBatchById(id);
  if (!result) notFound();

  const { batch, items } = result;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Batch detail</h2>
        <p className="text-sm text-zinc-600">{batch.id}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Status</p>
          <p className="mt-2 text-lg font-semibold capitalize">{batch.status}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="mt-2 text-lg font-semibold">{batch.total_count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Success</p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">{batch.success_count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Failed</p>
          <p className="mt-2 text-lg font-semibold text-red-700">{batch.failed_count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Source</p>
          <p className="mt-2 text-lg font-semibold uppercase">{batch.source_type}</p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2">Row</th>
              <th className="py-2">Status</th>
              <th className="py-2">Payout</th>
              <th className="py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100">
                <td className="py-3">{item.row_index}</td>
                <td className="py-3 capitalize">{item.status}</td>
                <td className="py-3">
                  {item.payout_id ? (
                    <Link href={`/payout/${item.payout_id}`} className="text-blue-700 hover:text-blue-900">
                      {item.payout_id.slice(0, 14)}...
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="py-3">{item.error_message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
