import type { BulkPayoutInput, Urgency } from "@/lib/types";

function parseUrgency(value: unknown): Urgency {
  return String(value ?? "").toLowerCase() === "fast" ? "fast" : "normal";
}

function toRow(input: Record<string, unknown>): BulkPayoutInput {
  return {
    recipient_name: String(input.recipient_name ?? "").trim(),
    recipient_email: String(input.recipient_email ?? "").trim(),
    recipient_address_line1: String(input.recipient_address_line1 ?? "").trim(),
    recipient_city: String(input.recipient_city ?? "").trim(),
    recipient_state: String(input.recipient_state ?? "").trim(),
    recipient_postal_code: String(input.recipient_postal_code ?? "").trim(),
    country: String(input.country ?? "").trim(),
    amount: Number(input.amount ?? 0),
    currency: String(input.currency ?? "USD").trim(),
    purpose: String(input.purpose ?? "").trim() || undefined,
    urgency: parseUrgency(input.urgency),
    bank_beneficiary_name: String(input.bank_beneficiary_name ?? "").trim() || undefined,
    bank_beneficiary_address: String(input.bank_beneficiary_address ?? "").trim() || undefined,
    bank_routing_number: String(input.bank_routing_number ?? "").trim() || undefined,
    bank_account_number: String(input.bank_account_number ?? "").trim() || undefined,
    bank_name: String(input.bank_name ?? "").trim() || undefined,
    bank_address: String(input.bank_address ?? "").trim() || undefined,
    bank_account_type: String(input.bank_account_type ?? "").toUpperCase() === "SAVINGS" ? "SAVINGS" : "CHECKING",
    wallet_address: String(input.wallet_address ?? "").trim() || undefined,
    wallet_network: String(input.wallet_network ?? "").trim() || undefined,
  };
}

function validateRow(row: BulkPayoutInput, index: number): string | null {
  if (!row.recipient_name) return `Row ${index}: recipient_name is required.`;
  if (!row.country) return `Row ${index}: country is required.`;
  if (!Number.isFinite(row.amount) || row.amount <= 0) return `Row ${index}: amount must be > 0.`;
  if (!row.currency) return `Row ${index}: currency is required.`;
  if (!row.recipient_email) return `Row ${index}: recipient_email is required.`;
  if (!row.recipient_address_line1 || !row.recipient_city || !row.recipient_state || !row.recipient_postal_code) {
    return `Row ${index}: recipient physical address fields are required.`;
  }
  return null;
}

export function parseCsvToBulkRows(csvText: string): { rows: BulkPayoutInput[]; errors: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return { rows: [], errors: ["CSV must include header and at least one data row."] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: BulkPayoutInput[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(",").map((v) => v.trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? "";
    });
    const row = toRow(obj);
    const validationError = validateRow(row, i);
    if (validationError) {
      errors.push(validationError);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

export function parseJsonToBulkRows(payload: unknown): { rows: BulkPayoutInput[]; errors: string[] } {
  if (!Array.isArray(payload)) {
    return { rows: [], errors: ["JSON payload must be an array of payout rows."] };
  }
  const rows: BulkPayoutInput[] = [];
  const errors: string[] = [];
  payload.forEach((item, idx) => {
    if (!item || typeof item !== "object") {
      errors.push(`Row ${idx + 1}: row must be an object.`);
      return;
    }
    const row = toRow(item as Record<string, unknown>);
    const validationError = validateRow(row, idx + 1);
    if (validationError) {
      errors.push(validationError);
      return;
    }
    rows.push(row);
  });
  return { rows, errors };
}
