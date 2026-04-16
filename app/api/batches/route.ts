import { NextResponse } from "next/server";
import { createPayoutBatch, getPayoutBatches } from "@/lib/repository";
import { parseCsvToBulkRows, parseJsonToBulkRows } from "@/lib/bulk";

export async function GET() {
  const batches = await getPayoutBatches();
  return NextResponse.json({ batches });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceType = body?.sourceType === "csv" ? "csv" : "json";
    const data = body?.data;
    const parsed = sourceType === "csv" ? parseCsvToBulkRows(String(data ?? "")) : parseJsonToBulkRows(data);

    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.errors }, { status: 400 });
    }
    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: "No valid rows to process." }, { status: 400 });
    }

    const batch = await createPayoutBatch(parsed.rows, sourceType);
    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error creating payout batch." },
      { status: 400 },
    );
  }
}
