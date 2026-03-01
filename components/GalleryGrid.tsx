import Link from "next/link";
import { TYPE_METADATA, RARITY_SYMBOLS } from "@/lib/types";
import type { CardListItem } from "@/lib/db";

interface Props {
  cards: CardListItem[];
}

export default function GalleryGrid({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const meta = TYPE_METADATA[card.primary_type];
        return (
          <Link
            key={card.id}
            href={`/unbox/${card.id}?revealed=true`}
            className="group relative bg-card border border-border/50 rounded-xl overflow-hidden hover:border-border hover:shadow-lg transition-all"
          >
            {/* Card image */}
            <div className="aspect-[2.5/3.5] relative overflow-hidden">
              <img
                src={card.image_url}
                alt={`${card.name} card`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>

            {/* Card info overlay at bottom */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{card.name}</span>
                <span className="text-red-400 text-xs font-medium">{card.hp} HP</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span style={{ color: meta.hex }}>
                  {meta.icon} {card.primary_type}
                </span>
                <span>
                  {RARITY_SYMBOLS[card.rarity]} {card.rarity}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
