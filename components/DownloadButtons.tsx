"use client";

import { useCallback, useState } from "react";
import type { CardProfile } from "@/lib/types";

interface DownloadButtonsProps {
  cardImageBase64: string;
  cardProfile: CardProfile;
  imagePrompt: string;
}

export function DownloadButtons({
  cardImageBase64,
  cardProfile,
  imagePrompt,
}: DownloadButtonsProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const downloadPNG = useCallback(() => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${cardImageBase64}`;
    link.download = `${cardProfile.name.toLowerCase().replace(/\s+/g, "-")}-card.png`;
    link.click();
  }, [cardImageBase64, cardProfile.name]);

  const downloadJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(cardProfile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cardProfile.name.toLowerCase().replace(/\s+/g, "-")}-profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [cardProfile]);

  const copyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(imagePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }, [imagePrompt]);

  const shareToX = useCallback(() => {
    const text = `Check out my AI agent's trading card! ${cardProfile.name} - ${cardProfile.primary_type} type, ${cardProfile.rarity} rarity. Generated with Agentmon.`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }, [cardProfile]);

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={downloadPNG}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        <span>📥</span>
        Download Card (PNG)
      </button>

      <button
        onClick={downloadJSON}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80 transition-colors"
      >
        <span>📋</span>
        Download Profile (JSON)
      </button>

      <button
        onClick={copyPrompt}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80 transition-colors"
      >
        <span>{copiedPrompt ? "✓" : "📝"}</span>
        {copiedPrompt ? "Copied!" : "Copy Prompt"}
      </button>

      <button
        onClick={shareToX}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80 transition-colors"
      >
        <span>𝕏</span>
        Share
      </button>
    </div>
  );
}
