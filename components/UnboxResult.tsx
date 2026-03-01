"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TYPE_METADATA, RARITY_SYMBOLS } from "@/lib/types";
import type { CardRecord } from "@/lib/db";

const CardViewer3D = dynamic(() => import("./CardViewer3D"), { ssr: false });

interface Props {
  card: CardRecord;
}

export default function UnboxResult({ card }: Props) {
  const profile = card.card_profile;
  const primaryMeta = TYPE_METADATA[profile.primary_type];
  const secondaryMeta = profile.secondary_type
    ? TYPE_METADATA[profile.secondary_type]
    : null;

  const [copiedLink, setCopiedLink] = useState(false);

  const shareToX = useCallback(() => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const text = `Check out my AI agent's trading card! ${profile.name} - ${profile.primary_type} type, ${profile.rarity} rarity. Generated with Agentmon.`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, "_blank");
  }, [profile]);

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  const downloadImage = useCallback(() => {
    const link = document.createElement("a");
    link.href = card.image_url;
    link.download = `${profile.name.toLowerCase().replace(/\s+/g, "-")}-agentmon.jpg`;
    link.target = "_blank";
    link.click();
  }, [card.image_url, profile.name]);

  return (
    <>
      {/* ── Full-viewport 3D canvas ── */}
      <div className="fixed inset-0 z-0">
        <CardViewer3D imageUrl={card.image_url} rarity={profile.rarity} />
      </div>

      {/* ── Right info panel ── */}
      <div className="fixed top-0 right-0 bottom-0 w-72 z-10 pt-14 flex flex-col pointer-events-none">
        <div
          className="flex-1 overflow-y-auto pointer-events-auto"
          style={{ background: "linear-gradient(to left, rgba(10,10,20,0.92) 70%, transparent)" }}
        >
          <div className="p-5 space-y-4">
            {/* Name + type */}
            <div>
              <h2 className="text-xl font-bold leading-tight">{profile.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.subtitle}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: primaryMeta.hex + "25", color: primaryMeta.hex }}
                >
                  {primaryMeta.icon} {profile.primary_type}
                </span>
                {secondaryMeta && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: secondaryMeta.hex + "25", color: secondaryMeta.hex }}
                  >
                    {secondaryMeta.icon} {profile.secondary_type}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-muted-foreground uppercase tracking-wider text-[10px]">HP</p>
                <p className="text-base font-bold text-red-400">{profile.hp}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Rarity</p>
                <p className="text-base font-bold">{RARITY_SYMBOLS[profile.rarity]}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Budget</p>
                <p className="text-base font-bold">{profile.stat_budget}</p>
              </div>
            </div>

            {/* Rarity label */}
            <p className="text-xs text-muted-foreground">{profile.rarity} rarity &middot; #{profile.serial_number}</p>

            <div className="border-t border-white/10" />

            {/* Ability */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-red-400 font-medium">Ability</p>
              <p className="text-sm font-semibold">{profile.ability.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{profile.ability.description}</p>
            </div>

            {/* Attacks */}
            {profile.attacks.map((attack, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{attack.energy_cost}</span>
                    <span className="text-sm font-semibold">{attack.name}</span>
                  </div>
                  <span className="text-base font-bold">{attack.damage}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{attack.description}</p>
              </div>
            ))}

            <div className="border-t border-white/10" />

            {/* Flavor text */}
            <p className="text-xs italic text-muted-foreground leading-relaxed">
              &ldquo;{profile.flavor_text}&rdquo;
            </p>
            <p className="text-[10px] text-muted-foreground/50">Illus. {profile.illustrator}</p>

            <div className="border-t border-white/10" />

            {/* Actions */}
            <div className="flex flex-col gap-2 pb-4">
              <button
                onClick={downloadImage}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:bg-primary/90 transition-colors text-center"
              >
                Download Card
              </button>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 px-3 py-2 bg-white/10 rounded-lg font-medium text-xs hover:bg-white/15 transition-colors text-center"
                >
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={shareToX}
                  className="flex-1 px-3 py-2 bg-white/10 rounded-lg font-medium text-xs hover:bg-white/15 transition-colors text-center"
                >
                  Share
                </button>
              </div>
              <Link
                href="/gallery"
                className="w-full px-3 py-2 border border-white/10 rounded-lg font-medium text-xs hover:bg-white/5 transition-colors text-center text-muted-foreground"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hint bottom-left ── */}
      <div className="fixed bottom-4 left-4 z-10 pointer-events-none">
        <p className="text-xs text-muted-foreground/50">Drag to rotate &middot; Scroll to zoom</p>
      </div>
    </>
  );
}
