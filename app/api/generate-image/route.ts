import { NextResponse } from "next/server";
import { assemblePrompt, getLayoutVersion } from "@/lib/assemble-prompt";
import { generateCardImage } from "@/lib/image-gen";
import { getNextSerialNumber } from "@/lib/serial";
import { saveGeneratedImage } from "@/lib/save-image";
import { CardProfileSchema, RARITIES, type Rarity, type FullCardProfile } from "@/lib/types";

// Gemini-only — typically completes in 15-25s
export const maxDuration = 60;

/**
 * Phase 2 of the split pipeline.
 * Takes a card profile JSON (from generate-profile), optionally overrides
 * the rarity, assigns a serial number, assembles the image prompt, and
 * generates the card image via Gemini.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { card_profile: rawProfile, rarity_override: rarityOverride } = body;

    if (!rawProfile) {
      return NextResponse.json(
        { error: "No card_profile provided" },
        { status: 400 }
      );
    }

    // Override rarity if requested (for all-rarities test mode)
    let profileToUse = rawProfile;
    if (rarityOverride && (RARITIES as readonly string[]).includes(rarityOverride)) {
      profileToUse = { ...rawProfile, rarity: rarityOverride as Rarity };
    }

    // Validate the profile
    const parsed = CardProfileSchema.safeParse(profileToUse);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid card profile: ${JSON.stringify(parsed.error.issues)}` },
        { status: 400 }
      );
    }

    // Assign unique serial number
    const serialNumber = await getNextSerialNumber();
    const fullProfile: FullCardProfile = { ...parsed.data, serial_number: serialNumber };

    // Assemble the image prompt (injects rarity-specific treatment)
    const imagePrompt = assemblePrompt(fullProfile);

    // Generate card image via Gemini
    const cardImageBase64 = await generateCardImage(imagePrompt);

    // Save image to local filesystem
    saveGeneratedImage(cardImageBase64, fullProfile);

    return NextResponse.json({
      card_image: cardImageBase64,
      card_profile: fullProfile,
      image_prompt: imagePrompt,
      layout_version: getLayoutVersion(),
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    const isConfigError =
      message.includes("not configured") || message.includes("PLACEHOLDER");

    return NextResponse.json(
      { error: message, type: isConfigError ? "config_error" : "generation_error" },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
