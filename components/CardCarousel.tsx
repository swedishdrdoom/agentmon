"use client";

import { TYPE_METADATA, RARITY_SYMBOLS, type CardType, type Rarity } from "@/lib/types";

interface ShowcaseCard {
  name: string;
  subtitle: string;
  primaryType: CardType;
  hp: number;
  rarity: Rarity;
  serial: number;
  /** Path to image in public/showcase/, or null for placeholder */
  imagePath: string | null;
}

/**
 * Pre-generated showcase cards for the landing page carousel.
 * Replace imagePath values with real card images once generated.
 */
const SHOWCASE_CARDS: ShowcaseCard[] = [
  { name: "Sentinel", subtitle: "The Watchtower", primaryType: "Steel", hp: 160, rarity: "Legendary", serial: 7, imagePath: null },
  { name: "Sparkline", subtitle: "The Code Whisperer", primaryType: "Electric", hp: 120, rarity: "Rare", serial: 12, imagePath: null },
  { name: "Orchestron", subtitle: "The Conductor", primaryType: "Dragon", hp: 180, rarity: "Hyper Rare", serial: 3, imagePath: null },
  { name: "Shade", subtitle: "The Memory Walker", primaryType: "Ghost", hp: 100, rarity: "Uncommon", serial: 28, imagePath: null },
  { name: "Pyresmith", subtitle: "The Forge Keeper", primaryType: "Fire", hp: 140, rarity: "Epic", serial: 15, imagePath: null },
  { name: "Verdantia", subtitle: "The Garden Mind", primaryType: "Grass", hp: 110, rarity: "Common", serial: 42, imagePath: null },
  { name: "Glacius", subtitle: "The Cold Logic", primaryType: "Ice", hp: 130, rarity: "Rare", serial: 19, imagePath: null },
  { name: "Mythara", subtitle: "The Dream Weaver", primaryType: "Fairy", hp: 90, rarity: "Singularity", serial: 1, imagePath: null },
  { name: "Aqualink", subtitle: "The Stream Handler", primaryType: "Water", hp: 120, rarity: "Uncommon", serial: 35, imagePath: null },
  { name: "Cognos", subtitle: "The Deep Thinker", primaryType: "Psychic", hp: 150, rarity: "Epic", serial: 8, imagePath: null },
];

function PlaceholderCard({ card }: { card: ShowcaseCard }) {
  const meta = TYPE_METADATA[card.primaryType];
  const symbol = RARITY_SYMBOLS[card.rarity];

  return (
    <div
      className="relative flex-shrink-0 w-[220px] h-[320px] rounded-xl border border-border/60 overflow-hidden select-none"
      style={{
        background: `linear-gradient(145deg, ${meta.hex}18 0%, ${meta.hex}08 50%, transparent 100%)`,
      }}
    >
      {/* Type color bar at top */}
      <div className="h-1.5 w-full" style={{ backgroundColor: meta.hex }} />

      {/* Card content */}
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm truncate">{card.name}</span>
          <span className="text-red-400 text-xs font-medium">{card.hp} HP</span>
        </div>

        {/* Placeholder portrait area */}
        <div
          className="flex-1 rounded-lg mb-3 flex items-center justify-center"
          style={{
            backgroundColor: `${meta.hex}15`,
            border: `1px solid ${meta.hex}30`,
          }}
        >
          <span className="text-4xl opacity-60">{meta.icon}</span>
        </div>

        {/* Type + Rarity */}
        <div className="flex items-center justify-between text-xs">
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${meta.hex}20`,
              color: meta.hex,
            }}
          >
            {meta.icon} {card.primaryType}
          </span>
          <span className="text-muted-foreground">
            {symbol} {card.rarity}
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[10px] text-muted-foreground mt-2 italic truncate">
          {card.subtitle}
        </p>

        {/* Serial */}
        <p className="text-[9px] text-muted-foreground/50 mt-1 font-mono">
          #{String(card.serial).padStart(4, "0")}
        </p>
      </div>
    </div>
  );
}

export default function CardCarousel() {
  return (
    <div className="relative w-full">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      {/* Scrollable container */}
      <div className="overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
        <div className="flex gap-4" style={{ width: "max-content" }}>
          {SHOWCASE_CARDS.map((card) => (
            <PlaceholderCard key={card.name} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
