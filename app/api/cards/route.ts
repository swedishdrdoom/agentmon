import { NextResponse } from "next/server";
import { listCards } from "@/lib/db";
import { RARITIES, CARD_TYPES, type Rarity, type CardType } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "24", 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const rarityParam = url.searchParams.get("rarity");
  const typeParam = url.searchParams.get("type");

  const rarity =
    rarityParam && (RARITIES as readonly string[]).includes(rarityParam)
      ? (rarityParam as Rarity)
      : undefined;

  const type =
    typeParam && (CARD_TYPES as readonly string[]).includes(typeParam)
      ? (typeParam as CardType)
      : undefined;

  const result = await listCards({ limit, offset, rarity, type });

  return NextResponse.json(result, {
    headers: {
      // Gallery data changes as new cards are generated — short cache
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
