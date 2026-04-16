import { NewPayoutForm } from "@/components/new-payout-form";

export default function NewPayoutPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Create Payout</h2>
      <p className="text-sm text-zinc-600">
        Submit a request, run routing logic, execute against Mural sandbox, and persist in ledger.
      </p>
      <NewPayoutForm />
    </div>
  );
}
