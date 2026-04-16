import Link from "next/link";
import { BulkUploadForm } from "@/components/bulk-upload-form";
import { getPayoutBatches } from "@/lib/repository";

export default async function BatchesPage() {
  const batches = await getPayoutBatches();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Payout Batches</h2>
        <p className="text-sm text-zinc-600">Upload CSV/JSON rows and process many payouts in one request.</p>
      </div>

      <BulkUploadForm />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2">Batch</th>
              <th className="py-2">Source</th>
              <th className="py-2">Status</th>
              <th className="py-2">Total</th>
              <th className="py-2">Success</th>
              <th className="py-2">Failed</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className="border-b border-zinc-100">
                <td className="py-3">
                  <Link href={`/batches/${batch.id}`} className="font-medium text-blue-700 hover:text-blue-900">
                    {batch.id.slice(0, 18)}...
                  </Link>
                </td>
                <td className="py-3 uppercase">{batch.source_type}</td>
                <td className="py-3 capitalize">{batch.status}</td>
                <td className="py-3">{batch.total_count}</td>
                <td className="py-3">{batch.success_count}</td>
                <td className="py-3">{batch.failed_count}</td>
              </tr>
            ))}
            {batches.length === 0 ? (
              <tr>
                <td className="py-6 text-zinc-500" colSpan={6}>
                  No batches yet. Create your first bulk payout batch above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
