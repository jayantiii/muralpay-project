import { NextResponse } from "next/server";
import { getPayoutById } from "@/lib/repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payout = await getPayoutById(id);
  if (!payout) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }
  return NextResponse.json(payout);
}
