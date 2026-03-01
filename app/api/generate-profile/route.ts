import { NextResponse } from "next/server";
import { lookupSkills } from "@/lib/skills-db";
import { generateCardProfile } from "@/lib/llm";
import { rollRarity } from "@/lib/rarity";
import { parseGenerateFormData } from "@/lib/parse-form-data";
import { handleRouteError } from "@/lib/route-helpers";
import { RARITIES, type Rarity } from "@/lib/types";

// Claude-only — typically completes in 10-15s
export const maxDuration = 60;

/**
 * Phase 1 of the split pipeline.
 * Calls Claude to generate the card profile (no image, no serial).
 */
export async function POST(request: Request) {
  try {
    const fd = parseGenerateFormData(await request.formData());

    if (!fd.rawText) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    const matchedSkills = lookupSkills(fd.skillSlugs);

    let rarity: Rarity;
    if (fd.forceRarity && (RARITIES as readonly string[]).includes(fd.forceRarity)) {
      rarity = fd.forceRarity as Rarity;
    } else {
      rarity = rollRarity();
    }

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

    return NextResponse.json({ card_profile: cardProfile });
  } catch (error) {
    return handleRouteError(error);
  }
}
