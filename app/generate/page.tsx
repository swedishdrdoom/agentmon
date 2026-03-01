"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { FileUploader } from "@/components/FileUploader";
import { GeneratingState } from "@/components/GeneratingState";
import { CardResult } from "@/components/CardResult";
import { AllRaritiesResult, type RarityCardResult } from "@/components/AllRaritiesResult";
import { parseAgentFiles } from "@/lib/parser";
import { RARITIES, type FullCardProfile, type Rarity } from "@/lib/types";

type ViewState = "upload" | "generating" | "result" | "all-rarities" | "error";

interface GenerationResult {
  card_image: string;
  card_profile: FullCardProfile;
  image_prompt: string;
  layout_version: string;
}

export default function GeneratePage() {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [rarityResults, setRarityResults] = useState<RarityCardResult[]>([]);

  // Store parsed data so we can reuse it for regeneration
  const [lastParsedData, setLastParsedData] = useState<FormData | null>(null);

  // Detect ?test=all-rarities URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsTestMode(params.get("test") === "all-rarities");
  }, []);

  // Safe JSON fetch — guards against non-JSON responses (e.g. Vercel timeout pages)
  const safeFetchJSON = useCallback(async (url: string, init: RequestInit) => {
    const response = await fetch(url, init);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        response.status === 504
          ? "Request timed out. Try again."
          : `Server error (${response.status}): ${text.slice(0, 120)}`
      );
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }
    return data;
  }, []);

  const generateCard = useCallback(
    (formData: FormData) =>
      safeFetchJSON("/api/generate", { method: "POST", body: formData }) as Promise<GenerationResult>,
    [safeFetchJSON]
  );

  const handleGenerateAllRarities = useCallback(async (baseFormData: FormData) => {
    // Initialise all slots as pending
    const initial: RarityCardResult[] = RARITIES.map((rarity) => ({
      rarity,
      status: "pending",
    }));
    setRarityResults(initial);
    setViewState("all-rarities");

    // ── Phase 1: Call Claude ONCE to get the base card profile (~15s) ──
    let baseProfile;
    try {
      const profileData = await safeFetchJSON("/api/generate-profile", {
        method: "POST",
        body: baseFormData,
      });
      baseProfile = profileData.card_profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile generation failed";
      // Mark all slots as failed
      setRarityResults((prev) =>
        prev.map((r) => ({ ...r, status: "error" as const, error: message }))
      );
      return;
    }

    // ── Phase 2: Generate images for each rarity via Gemini (~20s each) ──
    // Batch 2 at a time with stagger to avoid Gemini quota issues.
    const BATCH_SIZE = 2;
    const BATCH_DELAY_MS = 2000;

    const runOne = async (rarity: Rarity) => {
      setRarityResults((prev) =>
        prev.map((r) => (r.rarity === rarity ? { ...r, status: "generating" } : r))
      );

      try {
        const data = await safeFetchJSON("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_profile: baseProfile,
            rarity_override: rarity,
          }),
        });
        setRarityResults((prev) =>
          prev.map((r) =>
            r.rarity === rarity
              ? { ...r, status: "done", card_image: data.card_image, card_profile: data.card_profile }
              : r
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image generation failed";
        setRarityResults((prev) =>
          prev.map((r) =>
            r.rarity === rarity ? { ...r, status: "error", error: message } : r
          )
        );
      }
    };

    for (let i = 0; i < RARITIES.length; i += BATCH_SIZE) {
      const batch = RARITIES.slice(i, i + BATCH_SIZE) as Rarity[];
      await Promise.allSettled(batch.map(runOne));
      if (i + BATCH_SIZE < RARITIES.length) {
        await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
      }
    }
  }, [safeFetchJSON]);

  const handleRegenerate = useCallback(async () => {
    if (!lastParsedData) return;

    setIsRegenerating(true);
    try {
      const data = await generateCard(lastParsedData);
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Regeneration failed";
      setError(message);
      setViewState("error");
    } finally {
      setIsRegenerating(false);
    }
  }, [lastParsedData, generateCard]);

  const handleGenerate = useCallback(async () => {
    if (files.length === 0) return;

    setViewState("generating");
    setError(null);

    try {
      // Parse files client-side
      const parsed = await parseAgentFiles(files);

      // Build form data to send to API
      const formData = new FormData();
      formData.set("raw_text", parsed.raw_text);
      formData.set("file_names", JSON.stringify(parsed.file_names));
      formData.set("skill_slugs", JSON.stringify(parsed.skill_slugs));
      formData.set("agent_name", parsed.agent_name || "");
      formData.set("has_security_rules", String(parsed.has_security_rules));
      formData.set("has_cron_tasks", String(parsed.has_cron_tasks));
      formData.set("has_memory_system", String(parsed.has_memory_system));
      formData.set(
        "has_subagent_orchestration",
        String(parsed.has_subagent_orchestration)
      );
      formData.set(
        "has_multi_machine_setup",
        String(parsed.has_multi_machine_setup)
      );
      formData.set("tool_count", String(parsed.tool_count));
      formData.set("content_depth", parsed.content_depth);
      formData.set("total_content_length", String(parsed.total_content_length));
      formData.set("file_count", String(parsed.file_count));

      // Debug: allow forcing rarity via URL query param ?rarity=Singularity
      const urlParams = new URLSearchParams(window.location.search);
      const forceRarity = urlParams.get("rarity");
      if (forceRarity) {
        formData.set("force_rarity", forceRarity);
      }

      setLastParsedData(formData);

      if (isTestMode) {
        await handleGenerateAllRarities(formData);
      } else {
        const data = await generateCard(formData);
        setResult(data);
        setViewState("result");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setViewState("error");
    }
  }, [files, generateCard, isTestMode, handleGenerateAllRarities]);

  const handleStartOver = useCallback(() => {
    setViewState("upload");
    setFiles([]);
    setResult(null);
    setError(null);
    setLastParsedData(null);
    setIsRegenerating(false);
    setRarityResults([]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold hover:text-primary transition-colors">
            Agentmon <span className="text-sm text-muted-foreground font-normal">v1.3</span>
          </Link>
          {viewState !== "upload" && (
            <button
              onClick={handleStartOver}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className={viewState === "all-rarities" ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"}>
          {/* Upload state */}
          {viewState === "upload" && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Generate Your Card</h1>
                <p className="text-muted-foreground">
                  Upload your agent&apos;s configuration files to create a
                  unique trading card.
                </p>
              </div>

              {/* Test mode banner */}
              {isTestMode && (
                <div className="max-w-md mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-yellow-400 font-medium">
                    Test mode: Generate All Rarities — will produce 7 cards in parallel, one per rarity tier.
                  </p>
                </div>
              )}

              <FileUploader files={files} onFilesSelected={setFiles} />

              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={files.length === 0}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isTestMode ? "Generate All 7 Rarities" : "Generate Card"}
                </button>
              </div>

              {/* File type hints */}
              <div className="max-w-md mx-auto">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Recognized file types:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "SOUL.md",
                    "IDENTITY.md",
                    "AGENTS.md",
                    "SKILLS.md",
                    "MEMORY.md",
                    "TOOLS.md",
                    "USER.md",
                    "HEARTBEAT.md",
                    "RECOVERY.md",
                    "config.json",
                    "README.md",
                  ].map((name) => (
                    <span
                      key={name}
                      className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground font-mono"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Privacy notice */}
              <div className="max-w-md mx-auto bg-muted/30 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-medium text-foreground">Privacy:</span>{" "}
                  File contents are sent to Anthropic (Claude) and Google (Gemini) APIs
                  to generate your card. Files are processed in memory and never stored.
                  API keys and secrets are automatically redacted before processing.
                  Do not upload files containing sensitive personal information.
                </p>
              </div>
            </div>
          )}

          {/* Generating state */}
          {viewState === "generating" && <GeneratingState />}

          {/* All-rarities test state */}
          {viewState === "all-rarities" && (
            <AllRaritiesResult
              results={rarityResults}
              onStartOver={handleStartOver}
            />
          )}

          {/* Result state */}
          {viewState === "result" && result && (
            <CardResult
              cardImageBase64={result.card_image}
              cardProfile={result.card_profile}
              imagePrompt={result.image_prompt}
              onRegenerate={handleRegenerate}
              onStartOver={handleStartOver}
              isRegenerating={isRegenerating}
            />
          )}

          {/* Error state */}
          {viewState === "error" && (
            <div className="max-w-md mx-auto text-center space-y-6 py-16">
              <div className="text-5xl">😵</div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-4 font-mono text-left">
                  {error}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-6 py-2.5 border border-border rounded-lg font-medium text-sm hover:bg-muted transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
