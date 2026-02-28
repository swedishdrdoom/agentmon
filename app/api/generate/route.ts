import { NextResponse } from "next/server";
import { lookupSkills } from "@/lib/skills-db";
import { generateCardProfile } from "@/lib/llm";
import { assemblePrompt, getLayoutVersion } from "@/lib/assemble-prompt";
import { generateCardImage } from "@/lib/image-gen";

// Allow up to 60 seconds for the full pipeline (LLM + image gen)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // ── Extract files from form data ─────────────────────────────────
    const rawText = formData.get("raw_text") as string | null;
    const fileNamesRaw = formData.get("file_names") as string | null;
    const skillSlugsRaw = formData.get("skill_slugs") as string | null;
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

    // ── Call LLM for creative card profile ───────────────────────────
    const cardProfile = await generateCardProfile(rawText, matchedSkills, {
      file_names: fileNames,
      has_security_rules: hasSecurityRules,
      has_cron_tasks: hasCronTasks,
      has_memory_system: hasMemorySystem,
      has_subagent_orchestration: hasSubagentOrchestration,
      has_multi_machine_setup: hasMultiMachineSetup,
      tool_count: toolCount,
    });

    // ── Assemble complete Nano Banana prompt ─────────────────────────
    const imagePrompt = assemblePrompt(cardProfile);

    // ── Generate card image via Nano Banana ──────────────────────────
    const cardImageBase64 = await generateCardImage(imagePrompt);

    // ── Return everything ────────────────────────────────────────────
    return NextResponse.json({
      card_image: cardImageBase64,
      card_profile: cardProfile,
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
