import type { PayoutRecord } from "@/lib/types";

export function getDashboardStats(payouts: PayoutRecord[]) {
  const total = payouts.length;
  const completed = payouts.filter((p) => p.status === "completed").length;
  const failed = payouts.filter((p) => p.status === "failed").length;
  const volume = payouts.reduce((acc, payout) => acc + payout.amount, 0);
  const successRate = total === 0 ? 0 : (completed / total) * 100;

  return { total, completed, failed, volume, successRate };
}
