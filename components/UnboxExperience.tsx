"use client";

import { useState, useCallback, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import UnboxResult from "./UnboxResult";
import type { CardRecord } from "@/lib/db";
import type OriginalUnboxScene from "./UnboxScene";

// Lazy-load the 3D scene to avoid SSR issues with Three.js
const UnboxScene = dynamic(() => import("./UnboxScene"), { ssr: false }) as typeof OriginalUnboxScene;

type Phase = "sealed" | "opening" | "revealed";

interface Props {
  card: CardRecord;
  skipToReveal: boolean;
}

export default function UnboxExperience({ card, skipToReveal }: Props) {
  const [phase, setPhase] = useState<Phase>(skipToReveal ? "revealed" : "sealed");

  const handleOpen = useCallback(() => {
    setPhase("opening");
  }, []);

  const handleRevealComplete = useCallback(() => {
    setPhase("revealed");
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* 3D scene area */}
      {phase !== "revealed" && (
        <div className="relative flex-1 min-h-[60vh] flex flex-col items-center justify-center">
          <UnboxScene
            card={card}
            phase={phase}
            onOpen={handleOpen}
            onRevealComplete={handleRevealComplete}
          />

          {phase === "sealed" && (
            <div className="absolute bottom-8 text-center animate-pulse">
              <p className="text-sm text-muted-foreground">Click the pack to open</p>
            </div>
          )}
        </div>
      )}

      {/* Revealed card + details */}
      {phase === "revealed" && (
        <UnboxResult card={card} />
      )}
    </div>
  );
}
