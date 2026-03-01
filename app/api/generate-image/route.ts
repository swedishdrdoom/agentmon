import { NextResponse } from "next/server";
import { assemblePrompt, getLayoutVersion } from "@/lib/assemble-prompt";
import { generateCardImage } from "@/lib/image-gen";
import { getNextSerialNumber } from "@/lib/serial";
import { saveGeneratedImage } from "@/lib/save-image";
import { handleRouteError } from "@/lib/route-helpers";
import { CardProfileSchema, RARITIES, type Rarity, type FullCardProfile } from "@/lib/types";

// Gemini-only — typically completes in 15-25s
export const maxDuration = 60;

/**
 * Phase 2 of the split pipeline.
 * Takes a card profile JSON, optionally overrides rarity,
 * assigns a serial number, and generates the card image via Gemini.
 */
export async function POST(request: Request) {
  try {
    const { card_profile: rawProfile, rarity_override: rarityOverride } = await request.json();

    if (!rawProfile) {
      return NextResponse.json({ error: "No card_profile provided" }, { status: 400 });
    }

    // Override rarity if requested (for all-rarities test mode)
    let profileToUse = rawProfile;
    if (rarityOverride && (RARITIES as readonly string[]).includes(rarityOverride)) {
      profileToUse = { ...rawProfile, rarity: rarityOverride as Rarity };
    }

    const parsed = CardProfileSchema.safeParse(profileToUse);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid card profile: ${JSON.stringify(parsed.error.issues)}` },
        { status: 400 }
      );
    }

    const serialNumber = await getNextSerialNumber();
    const fullProfile: FullCardProfile = { ...parsed.data, serial_number: serialNumber };
    const imagePrompt = assemblePrompt(fullProfile);
    const cardImageBase64 = await generateCardImage(imagePrompt);

    saveGeneratedImage(cardImageBase64, fullProfile);

    return NextResponse.json({
      card_image: cardImageBase64,
      card_profile: fullProfile,
      image_prompt: imagePrompt,
      layout_version: getLayoutVersion(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
