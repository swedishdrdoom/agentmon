import { NextResponse } from "next/server";
import { getCard } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length > 30) {
    return NextResponse.json({ error: "Invalid card ID" }, { status: 400 });
  }

  const card = await getCard(id);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card, {
    headers: {
      // Cards are immutable — cache aggressively
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
