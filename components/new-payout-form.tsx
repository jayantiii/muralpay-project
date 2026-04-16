"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EVM_ADDRESS_PATTERN = "^0x[a-fA-F0-9]{40}$";

export function NewPayoutForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [preferredRail, setPreferredRail] = useState<"" | "bank" | "stablecoin">("");

  function prefillTestData() {
    const form = formRef.current;
    if (!form) return;

    const set = (name: string, value: string) => {
      const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
      if (!field) return;
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };

    set("recipient_name", "Vendor1");
    set("recipient_email", "vendor1@example.com");
    set("recipient_address_line1", "123 Mock St");
    set("recipient_city", "Houston");
    set("recipient_state", "Texas");
    set("recipient_postal_code", "77002");
    set("country", "US");
    set("amount", "100");
    set("currency", "USD");
    set("purpose", "Sandbox payout test");
    set("preferred_rail", "bank");
    set("bank_beneficiary_name", "Vendor1");
    set("bank_beneficiary_address", "123 Mock St, Houston, Texas 77002");
    set("bank_routing_number", "386642098");
    set("bank_account_number", "9472358599");
    set("bank_name", "Lead Bank");
    set("bank_address", "1801 Main St, Kansas City, MO 64108");
    set("bank_account_type", "CHECKING");
    set("wallet_address", "0x0c5872cfbC7f9C2Be62AC9706C84e34DD29ca1CD");
    set("wallet_network", "POLYGON");
    set("urgency", "normal");
    setError(null);
    setPrefillApplied(true);
  }

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setPrefillApplied(false);

    const payload = {
      recipient_name: String(formData.get("recipient_name") ?? ""),
      recipient_email: String(formData.get("recipient_email") ?? ""),
      recipient_address_line1: String(formData.get("recipient_address_line1") ?? ""),
      recipient_city: String(formData.get("recipient_city") ?? ""),
      recipient_state: String(formData.get("recipient_state") ?? ""),
      recipient_postal_code: String(formData.get("recipient_postal_code") ?? ""),
      country: String(formData.get("country") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      currency: String(formData.get("currency") ?? "USDC"),
      purpose: String(formData.get("purpose") ?? ""),
      urgency: String(formData.get("urgency") ?? "normal"),
      preferred_rail: String(formData.get("preferred_rail") ?? ""),
      bank_beneficiary_name: String(formData.get("bank_beneficiary_name") ?? ""),
      bank_beneficiary_address: String(formData.get("bank_beneficiary_address") ?? ""),
      bank_routing_number: String(formData.get("bank_routing_number") ?? ""),
      bank_account_number: String(formData.get("bank_account_number") ?? ""),
      bank_name: String(formData.get("bank_name") ?? ""),
      bank_address: String(formData.get("bank_address") ?? ""),
      bank_account_type: String(formData.get("bank_account_type") ?? "CHECKING"),
      wallet_address: String(formData.get("wallet_address") ?? ""),
      wallet_network: String(formData.get("wallet_network") ?? "POLYGON"),
    };

    const response = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Failed to create payout.");
      return;
    }
    router.push(`/payout/${data.payout.id}`);
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Create New Payout</h2>
        <div className="flex items-center gap-2">
          <select
            name="preferred_rail"
            value={preferredRail}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "bank" || value === "stablecoin") {
                setPreferredRail(value);
                return;
              }
              setPreferredRail("");
            }}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            <option value="">Auto (routing engine)</option>
            <option value="bank">Bank</option>
            <option value="stablecoin">Stablecoin</option>
          </select>
          <button
            type="button"
            onClick={prefillTestData}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Prefill test data
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input name="recipient_name" placeholder="Recipient name" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="recipient_email" type="email" placeholder="Recipient email" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="recipient_address_line1" placeholder="Recipient address line 1" className="rounded-lg border border-zinc-300 p-2 md:col-span-2" required />
        <input name="recipient_city" placeholder="City" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="recipient_state" placeholder="State / Province" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="recipient_postal_code" placeholder="Postal code" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="country" placeholder="Country code (e.g. MX)" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="currency" defaultValue="USD" className="rounded-lg border border-zinc-300 p-2" required />
        <input name="purpose" placeholder="Purpose" className="rounded-lg border border-zinc-300 p-2 md:col-span-2" />
        {preferredRail !== "stablecoin" ? (
          <>
            <input name="bank_beneficiary_name" placeholder="Bank beneficiary name (required for bank payouts)" className="rounded-lg border border-zinc-300 p-2 md:col-span-2" />
            <input name="bank_beneficiary_address" placeholder="Bank beneficiary address" className="rounded-lg border border-zinc-300 p-2 md:col-span-2" />
            <input name="bank_routing_number" placeholder="Bank routing number" className="rounded-lg border border-zinc-300 p-2" />
            <input name="bank_account_number" placeholder="Bank account number" className="rounded-lg border border-zinc-300 p-2" />
            <input name="bank_name" placeholder="Bank name" className="rounded-lg border border-zinc-300 p-2" />
            <input name="bank_address" placeholder="Bank address" className="rounded-lg border border-zinc-300 p-2" />
            <select name="bank_account_type" defaultValue="CHECKING" className="rounded-lg border border-zinc-300 p-2">
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
            </select>
          </>
        ) : null}
        {preferredRail !== "bank" ? (
          <>
            <input
              name="wallet_address"
              placeholder="Recipient wallet address (required for stablecoin payouts)"
              className="rounded-lg border border-zinc-300 p-2 md:col-span-2"
              defaultValue="0x0c5872cfbC7f9C2Be62AC9706C84e34DD29ca1CD"
              pattern={EVM_ADDRESS_PATTERN}
              title="Enter a valid wallet address: 0x followed by 40 hex characters."
            />
            <input name="wallet_network" defaultValue="POLYGON" placeholder="Wallet network (e.g. POLYGON)" className="rounded-lg border border-zinc-300 p-2 md:col-span-2" required />
          </>
        ) : null}
      </div>
      <select name="urgency" className="w-full rounded-lg border border-zinc-300 p-2">
        <option value="normal">Normal</option>
        <option value="fast">Fast</option>
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {prefillApplied ? <p className="text-sm text-emerald-700">Test data filled. You can submit now.</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit payout"}
      </button>
    </form>
  );
}
