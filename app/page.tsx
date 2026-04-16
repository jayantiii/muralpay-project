import Link from "next/link";
import { getPayouts } from "@/lib/repository";
import { getDashboardStats } from "@/lib/stats";
import { StatusBadge } from "@/components/status-badge";

export default async function Home() {
  const payouts = await getPayouts();
  const stats = getDashboardStats(payouts);
  const recent = payouts.slice(0, 8);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-sm text-zinc-600">Track USDC payout volume, success rate, and recent wallet settlements.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total payouts</p>
          <p className="mt-2 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Success rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.successRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total volume</p>
          <p className="mt-2 text-2xl font-bold">${stats.volume.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent payouts</h3>
          <Link href="/new" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            New payout
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2">Recipient</th>
                <th className="py-2">Country</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Rail</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((payout) => (
                <tr key={payout.id} className="border-b border-zinc-100">
                  <td className="py-3">
                    <Link href={`/payout/${payout.id}`} className="font-medium hover:text-blue-700">
                      {payout.recipient_name}
                    </Link>
                  </td>
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
              {recent.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={5}>
                    No payouts yet. Create your first payout.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
