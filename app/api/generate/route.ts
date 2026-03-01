import { NextResponse } from "next/server";
import { lookupSkills } from "@/lib/skills-db";
import { generateCardProfile } from "@/lib/llm";
import { assemblePrompt, getLayoutVersion } from "@/lib/assemble-prompt";
import { generateCardImage } from "@/lib/image-gen";
import { getNextSerialNumber } from "@/lib/serial";
import { rollRarity } from "@/lib/rarity";
import { saveGeneratedImage } from "@/lib/save-image";
import { RARITIES, type Rarity } from "@/lib/types";

// Allow up to 120 seconds for the full pipeline (LLM + image gen).
// Requires Vercel Pro plan or higher. On hobby plan this caps at 60s.
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // ── Extract files from form data ─────────────────────────────────
    const rawText = formData.get("raw_text") as string | null;
    const fileNamesRaw = formData.get("file_names") as string | null;
    const skillSlugsRaw = formData.get("skill_slugs") as string | null;
    const agentName = formData.get("agent_name") as string | null;
    const hasSecurityRules = formData.get("has_security_rules") === "true";
    const hasCronTasks = formData.get("has_cron_tasks") === "true";
    const hasMemorySystem = formData.get("has_memory_system") === "true";
    const hasSubagentOrchestration =
      formData.get("has_subagent_orchestration") === "true";
    const hasMultiMachineSetup =
      formData.get("has_multi_machine_setup") === "true";
    const toolCount = parseInt(
      (formData.get("tool_count") as string) || "0",
      10
    );
    const contentDepth = (formData.get("content_depth") as string) || "moderate";
    const totalContentLength = parseInt(
      (formData.get("total_content_length") as string) || "0",
      10
    );
    const fileCount = parseInt(
      (formData.get("file_count") as string) || "0",
      10
    );

    if (!rawText) {
      return NextResponse.json(
        { error: "No file content provided" },
        { status: 400 }
      );
    }

    const fileNames: string[] = fileNamesRaw
      ? JSON.parse(fileNamesRaw)
      : [];
    const skillSlugs: string[] = skillSlugsRaw
      ? JSON.parse(skillSlugsRaw)
      : [];

    // ── Cross-reference skills database ──────────────────────────────
    const matchedSkills = lookupSkills(skillSlugs);

    // ── Roll rarity (pure server-side RNG) ───────────────────────────
    // Debug override: pass force_rarity in form data to test specific tiers
    const forceRarity = formData.get("force_rarity") as string | null;
    let rarity: Rarity;
    if (forceRarity && (RARITIES as readonly string[]).includes(forceRarity)) {
      rarity = forceRarity as Rarity;
      console.log(`[generate] DEBUG: Forced rarity: ${rarity}`);
    } else {
      rarity = rollRarity();
    }
    console.log(`[generate] Rarity: ${rarity}`);

    // ── Call LLM for creative card profile ───────────────────────────
    const cardProfile = await generateCardProfile(rawText, matchedSkills, {
      file_names: fileNames,
      agent_name: agentName,
      has_security_rules: hasSecurityRules,
      has_cron_tasks: hasCronTasks,
      has_memory_system: hasMemorySystem,
      has_subagent_orchestration: hasSubagentOrchestration,
      has_multi_machine_setup: hasMultiMachineSetup,
      tool_count: toolCount,
      content_depth: contentDepth as "minimal" | "moderate" | "rich",
      total_content_length: totalContentLength,
      file_count: fileCount,
    }, rarity);

    // ── Assign unique serial number ─────────────────────────────────
    const serialNumber = await getNextSerialNumber();
    const cardProfileWithSerial = { ...cardProfile, serial_number: serialNumber };

    // ── Assemble complete Nano Banana prompt ─────────────────────────
    const imagePrompt = assemblePrompt(cardProfileWithSerial);

    // ── Generate card image via Nano Banana ──────────────────────────
    const cardImageBase64 = await generateCardImage(imagePrompt);

    // ── Save image to local filesystem (dev + opt-in prod) ───────────
    saveGeneratedImage(cardImageBase64, cardProfileWithSerial);

    // ── Return everything ────────────────────────────────────────────
    return NextResponse.json({
      card_image: cardImageBase64,
      card_profile: cardProfileWithSerial,
      image_prompt: imagePrompt,
      layout_version: getLayoutVersion(),
    });
  } catch (error) {
    console.error("Card generation error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Distinguish between config errors and runtime errors
    const isConfigError =
      message.includes("not configured") ||
      message.includes("PLACEHOLDER");

    return NextResponse.json(
      {
        error: message,
        type: isConfigError ? "config_error" : "generation_error",
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
