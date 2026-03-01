"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { RARITIES, CARD_TYPES, type Rarity, type CardType } from "@/lib/types";

interface Props {
  currentRarity?: Rarity;
  currentType?: CardType;
}

export default function GalleryFilters({ currentRarity, currentType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset to page 1 on filter change
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.push(`/gallery${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-3">
      <select
        value={currentRarity || ""}
        onChange={(e) => updateFilter("rarity", e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All Rarities</option>
        {RARITIES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <select
        value={currentType || ""}
        onChange={(e) => updateFilter("type", e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All Types</option>
        {CARD_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
