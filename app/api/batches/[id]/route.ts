import { NextResponse } from "next/server";
import { getPayoutBatchById } from "@/lib/repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getPayoutBatchById(id);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }
  return NextResponse.json(batch);
}
