import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { lookupSkills } from "@/lib/skills-db";
import { generateCardProfile } from "@/lib/llm";
import { assemblePrompt, getLayoutVersion } from "@/lib/assemble-prompt";
import { generateCardImage } from "@/lib/image-gen";
import { getNextSerialNumber } from "@/lib/serial";
import { rollRarity } from "@/lib/rarity";
import { saveGeneratedImage } from "@/lib/save-image";
import { uploadCardImage } from "@/lib/storage";
import { saveCard } from "@/lib/db";
import { parseGenerateFormData } from "@/lib/parse-form-data";
import { handleRouteError } from "@/lib/route-helpers";
import { RARITIES, type Rarity } from "@/lib/types";

// Allow up to 120 seconds for the full pipeline (LLM + image gen).
// Requires Vercel Pro plan or higher. On hobby plan this caps at 60s.
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const fd = parseGenerateFormData(await request.formData());

    if (!fd.rawText) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    const matchedSkills = lookupSkills(fd.skillSlugs);

    // Roll rarity (debug override via force_rarity)
    let rarity: Rarity;
    if (fd.forceRarity && (RARITIES as readonly string[]).includes(fd.forceRarity)) {
      rarity = fd.forceRarity as Rarity;
      console.log(`[generate] DEBUG: Forced rarity: ${rarity}`);
    } else {
      rarity = rollRarity();
    }
    console.log(`[generate] Rarity: ${rarity}`);

    const cardProfile = await generateCardProfile(fd.rawText, matchedSkills, {
      file_names: fd.fileNames,
      agent_name: fd.agentName,
      has_security_rules: fd.hasSecurityRules,
      has_cron_tasks: fd.hasCronTasks,
      has_memory_system: fd.hasMemorySystem,
      has_subagent_orchestration: fd.hasSubagentOrchestration,
      has_multi_machine_setup: fd.hasMultiMachineSetup,
      tool_count: fd.toolCount,
      content_depth: fd.contentDepth,
      total_content_length: fd.totalContentLength,
      file_count: fd.fileCount,
    }, rarity);

    const serialNumber = await getNextSerialNumber();
    const fullProfile = { ...cardProfile, serial_number: serialNumber };
    const imagePrompt = assemblePrompt(fullProfile);
    const cardImageBase64 = await generateCardImage(imagePrompt);

    saveGeneratedImage(cardImageBase64, fullProfile);

    // Persist card to database + blob storage (non-blocking if not configured)
    const cardId = nanoid(12);
    let unboxUrl: string | null = null;

    try {
      const imageUrl = await uploadCardImage(cardImageBase64, fullProfile, cardId);
      if (imageUrl) {
        await saveCard(cardId, fullProfile, imagePrompt, imageUrl);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentmon.com";
        unboxUrl = `${appUrl}/unbox/${cardId}`;
        console.log(`[generate] Card persisted: ${unboxUrl}`);
      }
    } catch (persistError) {
      // Non-fatal — card was still generated, just not persisted
      console.warn("[generate] Failed to persist card:", persistError);
    }

    return NextResponse.json({
      card_id: cardId,
      unbox_url: unboxUrl,
      card_image: cardImageBase64,
      card_profile: fullProfile,
      image_prompt: imagePrompt,
      layout_version: getLayoutVersion(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
