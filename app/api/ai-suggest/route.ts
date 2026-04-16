import { NextResponse } from "next/server";
import { decideRail } from "@/lib/routing";
import type { CreatePayoutInput } from "@/lib/types";

interface SuggestRequest {
  prompt?: string;
}

function inferInput(prompt: string): CreatePayoutInput {
  const upper = prompt.toUpperCase();
  const amountMatch = prompt.match(/\$?\s?(\d+(\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : 100;

  let country = "US";
  if (upper.includes("MEXICO")) country = "MX";
  if (upper.includes("COLOMBIA")) country = "CO";
  if (upper.includes("BRAZIL")) country = "BR";
  if (upper.includes("EUROPE") || upper.includes("GERMANY")) country = "DE";

  return {
    recipient_name: "Suggested Recipient",
    country,
    amount,
    currency: "USD",
    purpose: "ai-suggested",
    urgency: upper.includes("URGENT") || upper.includes("FAST") ? "fast" : "normal",
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SuggestRequest;
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }
  const inferred = inferInput(prompt);
  const decision = decideRail(inferred);
  return NextResponse.json({
    suggested_rail: decision.selected_rail,
    reason: decision.reason,
    interpreted_input: inferred,
  });
}
