import type { PayoutStatus } from "@/lib/types";

const statusStyles: Record<PayoutStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
