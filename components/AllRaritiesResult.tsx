"use client";

import { RARITIES, RARITY_SYMBOLS, type Rarity, type FullCardProfile } from "@/lib/types";

export interface RarityCardResult {
  rarity: Rarity;
  status: "pending" | "generating" | "done" | "error";
  card_image?: string;
  card_profile?: FullCardProfile;
  error?: string;
}

interface AllRaritiesResultProps {
  results: RarityCardResult[];
  onStartOver: () => void;
}

export function AllRaritiesResult({ results, onStartOver }: AllRaritiesResultProps) {
  const doneCount = results.filter((r) => r.status === "done").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const generatingCount = results.filter((r) => r.status === "generating").length;
  const allPending = results.every((r) => r.status === "pending");
  const total = RARITIES.length;

  // Phase label
  let phaseLabel: string;
  if (allPending) {
    phaseLabel = "Generating card profile...";
  } else if (doneCount + errorCount === total) {
    phaseLabel = `Done — ${doneCount} succeeded, ${errorCount} failed`;
  } else {
    phaseLabel = `${doneCount} / ${total} cards generated${generatingCount > 0 ? `, ${generatingCount} in progress` : ""}`;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Rarities Test</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {phaseLabel}
          </p>
        </div>
        <button
          onClick={onStartOver}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${((doneCount + errorCount) / total) * 100}%` }}
        />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {results.map((result) => (
          <RarityCardSlot key={result.rarity} result={result} />
        ))}
      </div>
    </div>
  );
}

function RarityCardSlot({ result }: { result: RarityCardResult }) {
  const symbol = RARITY_SYMBOLS[result.rarity];

  return (
    <div className="flex flex-col gap-2">
      {/* Rarity label */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-mono text-muted-foreground">{symbol}</span>
        <span className="text-sm font-medium">{result.rarity}</span>
      </div>

      {/* Card slot */}
      <div className="aspect-[5/7] rounded-xl overflow-hidden border border-border bg-muted/30 relative flex items-center justify-center">
        {result.status === "done" && result.card_image ? (
          <img
            src={`data:image/jpeg;base64,${result.card_image}`}
            alt={`${result.rarity} rarity card`}
            className="w-full h-full object-cover"
          />
        ) : result.status === "error" ? (
          <div className="text-center p-4 space-y-2">
            <p className="text-2xl">⚠️</p>
            <p className="text-xs text-destructive font-mono break-words">
              {result.error?.includes("Server Components")
                ? "Request timed out. Try again."
                : result.error ?? "Unknown error"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Pulsing placeholder card outline */}
            <div className="relative w-16 h-24">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground/60 animate-pulse">
              {result.status === "generating" ? "Generating..." : "Waiting..."}
            </p>
          </div>
        )}
      </div>

      {/* Card name when done */}
      {result.status === "done" && result.card_profile && (
        <p className="text-xs text-muted-foreground truncate text-center">
          {result.card_profile.name}
        </p>
      )}
    </div>
  );
}
