"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const jsonTemplate = JSON.stringify(
  [
    {
      recipient_name: "Vendor1",
      recipient_email: "vendor1@example.com",
      recipient_address_line1: "123 Mock St",
      recipient_city: "Houston",
      recipient_state: "Texas",
      recipient_postal_code: "77002",
      country: "US",
      amount: 100,
      currency: "USD",
      purpose: "Invoice 101",
      urgency: "normal",
      bank_beneficiary_name: "Vendor1",
      bank_beneficiary_address: "123 Mock St, Houston, Texas 77002",
      bank_routing_number: "386642098",
      bank_account_number: "9472358599",
      bank_name: "Lead Bank",
      bank_address: "1801 Main St, Kansas City, MO 64108",
      bank_account_type: "CHECKING",
      wallet_address: "0x0c5872cfbC7f9C2Be62AC9706C84e34DD29ca1CD",
      wallet_network: "POLYGON",
    },
  ],
  null,
  2,
);

const csvTemplate = `recipient_name,recipient_email,recipient_address_line1,recipient_city,recipient_state,recipient_postal_code,country,amount,currency,purpose,urgency,bank_beneficiary_name,bank_beneficiary_address,bank_routing_number,bank_account_number,bank_name,bank_address,bank_account_type,wallet_address,wallet_network
Vendor1,vendor1@example.com,123 Mock St,Houston,Texas,77002,US,100,USD,Invoice 101,normal,Vendor1,"123 Mock St, Houston, Texas 77002",386642098,9472358599,Lead Bank,"1801 Main St, Kansas City, MO 64108",CHECKING,0x0c5872cfbC7f9C2Be62AC9706C84e34DD29ca1CD,POLYGON`;

export function BulkUploadForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"json" | "csv">("json");
  const [data, setData] = useState(jsonTemplate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    const text = await file.text();
    setSourceType("csv");
    setData(text);
    setFileName(file.name);
    setError(null);
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const payload = sourceType === "json" ? JSON.parse(data) : data;
    const response = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, data: payload }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      const details = Array.isArray(body.details) ? ` ${body.details.join(" | ")}` : "";
      setError(`${body.error ?? "Failed to create batch."}${details}`);
      return;
    }
    router.push(`/batches/${body.batch.id}`);
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Source type</label>
        <select
          value={sourceType}
          onChange={(event) => {
            const nextType = event.target.value === "csv" ? "csv" : "json";
            setSourceType(nextType);
            setData(nextType === "csv" ? csvTemplate : jsonTemplate);
          }}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700">Upload CSV file (optional)</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void onFileSelected(file);
          }}
          className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
        />
        {fileName ? <p className="text-xs text-zinc-500">Loaded file: {fileName}</p> : null}
      </div>
      <textarea
        value={data}
        onChange={(event) => setData(event.target.value)}
        className="min-h-80 w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating batch..." : "Create bulk batch"}
      </button>
    </div>
  );
}
