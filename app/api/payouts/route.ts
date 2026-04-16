import { NextResponse } from "next/server";
import { createPayout, getPayouts } from "@/lib/repository";
import type { CreatePayoutInput } from "@/lib/types";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_NAME_TO_ALPHA2: Record<string, string> = {
  "UNITED STATES": "US",
};

function normalizeCountryCode(value: string): string {
  const raw = value.trim().toUpperCase();
  if (COUNTRY_NAME_TO_ALPHA2[raw]) return COUNTRY_NAME_TO_ALPHA2[raw];
  return raw;
}

function parseCreateInput(body: unknown): CreatePayoutInput {
  const data = body as Partial<CreatePayoutInput>;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid payload.");
  }

  if (!data.recipient_name || !data.country || !data.amount || !data.currency || !data.urgency) {
    throw new Error("Missing required fields.");
  }

  if (Number(data.amount) <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const recipientEmail = data.recipient_email ? String(data.recipient_email).trim() : "";
  if (!EMAIL_REGEX.test(recipientEmail)) {
    throw new Error("recipient_email must be a valid email.");
  }
  const addressLine1 = data.recipient_address_line1 ? String(data.recipient_address_line1).trim() : "";
  const city = data.recipient_city ? String(data.recipient_city).trim() : "";
  const state = data.recipient_state ? String(data.recipient_state).trim() : "";
  const postalCode = data.recipient_postal_code ? String(data.recipient_postal_code).trim() : "";
  if (!addressLine1 || !city || !state || !postalCode) {
    throw new Error("Recipient physical address fields are required.");
  }
  const countryCode = normalizeCountryCode(String(data.country ?? ""));
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("country must be a valid ISO alpha-2 code (e.g. US).");
  }

  const walletAddress = data.wallet_address ? String(data.wallet_address).trim() : "";
  if (walletAddress && !EVM_ADDRESS_REGEX.test(walletAddress)) {
    throw new Error("wallet_address must be a valid EVM address (0x + 40 hex chars).");
  }

  return {
    recipient_name: String(data.recipient_name),
    recipient_email: recipientEmail,
    recipient_address_line1: addressLine1,
    recipient_city: city,
    recipient_state: state,
    recipient_postal_code: postalCode,
    country: countryCode,
    amount: Number(data.amount),
    currency: String(data.currency),
    purpose: data.purpose ? String(data.purpose) : undefined,
    urgency: data.urgency === "fast" ? "fast" : "normal",
    bank_beneficiary_name: data.bank_beneficiary_name ? String(data.bank_beneficiary_name).trim() : undefined,
    bank_beneficiary_address: data.bank_beneficiary_address ? String(data.bank_beneficiary_address).trim() : undefined,
    bank_routing_number: data.bank_routing_number ? String(data.bank_routing_number).trim() : undefined,
    bank_account_number: data.bank_account_number ? String(data.bank_account_number).trim() : undefined,
    bank_name: data.bank_name ? String(data.bank_name).trim() : undefined,
    bank_address: data.bank_address ? String(data.bank_address).trim() : undefined,
    bank_account_type: data.bank_account_type === "SAVINGS" ? "SAVINGS" : "CHECKING",
    wallet_address: walletAddress || undefined,
    wallet_network: data.wallet_network ? String(data.wallet_network).trim() : undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payouts = await getPayouts({
    country: searchParams.get("country") ?? undefined,
    rail: (searchParams.get("rail") as "bank" | "stablecoin" | null) ?? undefined,
    status: (searchParams.get("status") as "pending" | "processing" | "completed" | "failed" | null) ?? undefined,
  });
  return NextResponse.json({ payouts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseCreateInput(body);
    const result = await createPayout(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error creating payout." },
      { status: 400 },
    );
  }
}
