"use client";

import type { FullCardProfile } from "@/lib/types";
import { TYPE_METADATA, RARITY_SYMBOLS } from "@/lib/types";
import { DownloadButtons } from "./DownloadButtons";

interface CardResultProps {
  cardImageBase64: string;
  cardProfile: FullCardProfile;
  imagePrompt: string;
  onRegenerate: () => void;
  onStartOver: () => void;
  isRegenerating: boolean;
}

export function CardResult({
  cardImageBase64,
  cardProfile,
  imagePrompt,
  onRegenerate,
  onStartOver,
  isRegenerating,
}: CardResultProps) {
  const primaryMeta = TYPE_METADATA[cardProfile.primary_type];
  const secondaryMeta = cardProfile.secondary_type
    ? TYPE_METADATA[cardProfile.secondary_type]
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Card image */}
      <div className="flex justify-center">
        <div className="relative group">
          <img
            src={`data:image/jpeg;base64,${cardImageBase64}`}
            alt={`${cardProfile.name} trading card`}
            className="max-w-sm w-full rounded-xl shadow-2xl shadow-primary/10 border border-white/5"
          />
          {/* Holographic overlay effect for rare+ cards */}
          {["Rare", "Epic", "Legendary", "Hyper Rare", "Singularity"].includes(
            cardProfile.rarity
          ) && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none group-hover:via-white/10 transition-all" />
          )}
        </div>
      </div>

      {/* Card stats summary */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">{cardProfile.name}</h2>
            <p className="text-muted-foreground text-sm">
              {cardProfile.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: primaryMeta.hex + "20",
                color: primaryMeta.hex,
              }}
            >
              {primaryMeta.icon} {cardProfile.primary_type}
            </span>
            {secondaryMeta && (
              <span
                className="text-lg px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: secondaryMeta.hex + "20",
                  color: secondaryMeta.hex,
                }}
              >
                {secondaryMeta.icon} {cardProfile.secondary_type}
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              HP
            </p>
            <p className="text-xl font-bold text-red-400">{cardProfile.hp}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Rarity
            </p>
            <p className="text-xl font-bold">
              {RARITY_SYMBOLS[cardProfile.rarity]} {cardProfile.rarity}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Budget
            </p>
            <p className="text-xl font-bold">
              {cardProfile.stat_budget}
            </p>
          </div>
        </div>

        {/* Ability & Attacks */}
        <div className="space-y-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider text-red-400 font-medium">
              Ability
            </p>
            <p className="font-bold">{cardProfile.ability.name}</p>
            <p className="text-sm text-muted-foreground">
              {cardProfile.ability.description}
            </p>
          </div>

          {cardProfile.attacks.map((attack, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm mr-2">{attack.energy_cost}</span>
                  <span className="font-bold">{attack.name}</span>
                </div>
                <span className="text-xl font-bold">{attack.damage}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {attack.description}
              </p>
            </div>
          ))}
        </div>

        {/* Flavor text */}
        <div className="border-t border-border pt-4">
          <p className="text-sm italic text-muted-foreground">
            &ldquo;{cardProfile.flavor_text}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            #{cardProfile.serial_number} &middot; Illus.{" "}
            {cardProfile.illustrator}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <DownloadButtons
          cardImageBase64={cardImageBase64}
          cardProfile={cardProfile}
          imagePrompt={imagePrompt}
        />

        <div className="flex gap-3">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Card"}
          </button>
          <button
            onClick={onStartOver}
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
