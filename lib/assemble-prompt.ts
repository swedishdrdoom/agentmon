import {
  TYPE_METADATA,
  RARITY_SYMBOLS,
  type CardProfile,
  type CardType,
} from "./types";
import { CARD_LAYOUT_TEMPLATE, CARD_LAYOUT_VERSION } from "./prompt-template";

// ── Helpers ──────────────────────────────────────────────────────────

function getTypeIcon(type: CardType): string {
  return TYPE_METADATA[type].icon;
}

function getTypeHex(type: CardType): string {
  return TYPE_METADATA[type].hex;
}

function getTypeColor(type: CardType): string {
  return TYPE_METADATA[type].color;
}

function buildBorderStyle(profile: CardProfile): string {
  if (profile.secondary_type) {
    const primaryHex = getTypeHex(profile.primary_type);
    const secondaryHex = getTypeHex(profile.secondary_type);
    return `Gradient border transitioning from ${profile.primary_type} color (${primaryHex}) to ${profile.secondary_type} color (${secondaryHex}) with metallic edge effect`;
  }
  return `Solid ${profile.primary_type} colored border (${getTypeHex(profile.primary_type)}) with metallic edge effect`;
}

function buildSecondaryTypeIconLine(profile: CardProfile): string {
  if (profile.secondary_type) {
    return `- Show a smaller ${getTypeIcon(profile.secondary_type)} ${profile.secondary_type} type icon next to the primary ${getTypeIcon(profile.primary_type)} icon`;
  }
  return "";
}

function buildAttackRows(profile: CardProfile): string {
  const rows: string[] = [];

  rows.push("ATTACK ROWS:");
  for (const attack of profile.attacks) {
    rows.push(`Attack row:`);
    rows.push(`- Left side: energy cost icons: ${attack.energy_cost}`);
    rows.push(`- Center: "${attack.name}" in bold`);
    rows.push(`- Right side: "${attack.damage}" in large bold text`);
    rows.push(`- Below: "${attack.description}" in small text`);
    rows.push("");
  }

  return rows.join("\n");
}

function buildRetreatDots(retreatCost: number): string {
  if (retreatCost === 0) return "none (free retreat)";
  return Array(retreatCost).fill("⚪").join(" ");
}

// ── Main Assembler ───────────────────────────────────────────────────

/**
 * Combines the card profile JSON from the LLM with the card layout template
 * to produce a complete Nano Banana image generation prompt.
 */
export function assemblePrompt(cardProfile: CardProfile): string {
  const prompt = CARD_LAYOUT_TEMPLATE
    // Border
    .replace("[BORDER_STYLE]", buildBorderStyle(cardProfile))
    // Type colors
    .replace("[PRIMARY_TYPE_COLOR]", `${cardProfile.primary_type} (${getTypeColor(cardProfile.primary_type)}, ${getTypeHex(cardProfile.primary_type)})`)
    // Top section
    .replace("[EVOLUTION_STAGE]", cardProfile.evolution_stage)
    .replace("[NAME]", cardProfile.name)
    .replace("[HP]", cardProfile.hp.toString())
    .replace("[PRIMARY_TYPE_ICON]", `${getTypeIcon(cardProfile.primary_type)} ${cardProfile.primary_type}`)
    .replace("[SUBTITLE]", cardProfile.subtitle)
    .replace("[SECONDARY_TYPE_ICON_LINE]", buildSecondaryTypeIconLine(cardProfile))
    // Art box
    .replace("[IMAGE_PROMPT]", cardProfile.image_prompt)
    // Ability
    .replace("[ABILITY_NAME]", cardProfile.ability.name)
    .replace("[ABILITY_DESCRIPTION]", cardProfile.ability.description)
    // Attacks
    .replace("[ATTACK_ROWS]", buildAttackRows(cardProfile))
    // Bottom stats
    .replace("[WEAKNESS_TYPE_ICON]", `${getTypeIcon(cardProfile.weakness.type as CardType)} ${cardProfile.weakness.type}`)
    .replace("[RESISTANCE_TYPE_ICON]", `${getTypeIcon(cardProfile.resistance.type as CardType)} ${cardProfile.resistance.type}`)
    .replace("[RETREAT_DOTS]", buildRetreatDots(cardProfile.retreat_cost))
    // Footer
    .replace("[ILLUSTRATOR]", cardProfile.illustrator)
    .replace("[CARD_NUMBER]", cardProfile.card_number)
    .replace("[RARITY_SYMBOL]", RARITY_SYMBOLS[cardProfile.rarity])
    .replace("[FLAVOR_TEXT]", cardProfile.flavor_text)
    // Rarity treatment (replace both occurrences)
    .replace(/\[RARITY\]/g, cardProfile.rarity);

  return prompt;
}

/**
 * Get the current card layout version.
 */
export function getLayoutVersion(): string {
  return CARD_LAYOUT_VERSION;
}
