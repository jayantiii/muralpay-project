import Link from "next/link";
import { getPayouts } from "@/lib/repository";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    country?: string;
    rail?: "bank" | "stablecoin";
    status?: "pending" | "processing" | "completed" | "failed";
  }>;
}

export default async function PayoutsPage({ searchParams }: Props) {
  const params = await searchParams;
  const payouts = await getPayouts({
    country: params.country,
    rail: params.rail,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Payouts</h2>
          <p className="text-sm text-zinc-600">Filter by country, rail, and status.</p>
        </div>
        <Link href="/new" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New payout
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 md:grid-cols-4">
        <input
          name="country"
          defaultValue={params.country ?? ""}
          className="rounded-lg border border-zinc-300 p-2"
          placeholder="Country (MX)"
        />
        <select name="rail" defaultValue={params.rail ?? ""} className="rounded-lg border border-zinc-300 p-2">
          <option value="">All rails</option>
          <option value="bank">Bank</option>
          <option value="stablecoin">Stablecoin</option>
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-zinc-300 p-2">
          <option value="">All status</option>
          <option value="pending">pending</option>
          <option value="processing">processing</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700">
          Apply filters
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2">ID</th>
              <th className="py-2">Recipient</th>
              <th className="py-2">Country</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Rail</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-b border-zinc-100">
                <td className="py-3">
                  <Link href={`/payout/${payout.id}`} className="font-medium text-blue-700 hover:text-blue-900">
                    {payout.id.slice(0, 14)}...
                  </Link>
                </td>
                <td className="py-3">{payout.recipient_name}</td>
                <td className="py-3">{payout.country}</td>
                <td className="py-3">
                  {payout.currency} {payout.amount.toFixed(2)}
                </td>
                <td className="py-3 capitalize">{payout.rail}</td>
                <td className="py-3">
                  <StatusBadge status={payout.status} />
                </td>
              </tr>
            ))}
            {payouts.length === 0 ? (
              <tr>
                <td className="py-6 text-zinc-500" colSpan={6}>
                  No payouts match current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
