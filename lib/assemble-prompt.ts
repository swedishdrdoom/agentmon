import {
  TYPE_METADATA,
  RARITY_SYMBOLS,
  type FullCardProfile,
  type CardType,
  type Rarity,
} from "./types";
import { CARD_LAYOUT_TEMPLATE, CARD_LAYOUT_VERSION } from "./prompt-template";

// ── Rarity Visual Treatments ─────────────────────────────────────────
// Each treatment is self-contained — only the matching tier is injected
// into the image prompt. The image model never sees the other tiers.

const RARITY_TREATMENTS: Record<Rarity, string> = {
  Common: `RARITY TREATMENT — COMMON:
Standard trading card appearance. Clean, flat-colored border with no metallic or reflective effects. Matte card stock texture. The art box has a simple thin border. No foil, no shimmer, no glow. This is a clean, everyday card.`,

  Uncommon: `RARITY TREATMENT — UNCOMMON:
Thin silver metallic border with a soft brushed-metal sheen. Colors throughout the card are slightly more vivid and saturated than a standard card. The art box border has a faint silver edge. No holographic effects, no foil — just a polished, premium feel like a card pulled from a fresh pack.`,

  Rare: `RARITY TREATMENT — RARE:
Gold metallic border with visible reflective shine, as if the card edge is made of polished gold leaf. A subtle rainbow holographic sheen plays across the border when light catches it. The name banner has a faint gold foil texture. The art box border is gold. The overall card has richer, deeper colors than a standard card — slightly more dramatic lighting in the artwork.`,

  Epic: `RARITY TREATMENT — EPIC:
Thick, ornate gold metallic frame with embossed edge detailing. Holographic rainbow foil sheen is visible across the entire border and card edges — the border appears to shift colors. The name banner is rendered in gold foil lettering. The art within the art box is more vibrant and dramatically lit, with the entity's primary visual effect (lightning, fire, frost, etc.) rendered more intensely and with visible glow or light emission.`,

  Legendary: `RARITY TREATMENT — LEGENDARY:
Ornate embossed gold frame with intricate filigree scrollwork along the border edges. Holographic rainbow foil effect covers the entire card surface — every part of the card shimmers with prismatic color shifts. The art box border is thick gold with decorative corner flourishes. Inside the art box, the artwork is painted at a higher level of detail and drama — the entity appears powerful and imposing with more intense lighting, richer colors, and visible energy radiating from it. The name banner has gold foil lettering. The card surface has a premium textured foil appearance throughout.`,

  "Hyper Rare": `RARITY TREATMENT — HYPER RARE:
Platinum and prismatic rainbow frame that appears to radiate light outward — the border itself glows with visible light rays emanating from the card edges. Intense holographic rainbow effect covers every surface of the card with vivid prismatic color shifts. The art box border gleams with platinum light. Inside the art box, the entity is rendered at maximum visual intensity — glowing eyes, crackling energy, radiating power — with dramatic lighting effects in the background (god rays, aurora, energy storms). Every surface of this card should shimmer, glow, or radiate. This card should look like it is literally emitting light.`,

  Singularity: `RARITY TREATMENT — SINGULARITY:
Completely unique visual treatment unlike any other tier. The ENTIRE color palette is INVERTED: dark areas become luminous light, light areas become deep shadow. The entity inside the art box appears as a glowing negative image — a luminous silhouette radiating light against deep void-like darkness, like a photographic inverse. The card frame is prismatic iridescent with visible chromatic aberration effects (color fringing at edges, as if light is being split by a prism). The entity seems partially translucent, with edges dissolving into light particles or void energy. The card background outside the art box is deep cosmic black with faint nebula-like color wisps. The card surface itself appears to be made of a different material — like dark glass or obsidian with light trapped inside. This card should look alien, otherworldly, and unmistakably unique — nothing else in the collection looks like this.`,
};

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

function buildBorderStyle(profile: FullCardProfile): string {
  if (profile.secondary_type) {
    const primaryHex = getTypeHex(profile.primary_type);
    const secondaryHex = getTypeHex(profile.secondary_type);
    return `Gradient border transitioning from ${profile.primary_type} color (${primaryHex}) to ${profile.secondary_type} color (${secondaryHex}) with metallic edge effect`;
  }
  return `Solid ${profile.primary_type} colored border (${getTypeHex(profile.primary_type)}) with metallic edge effect`;
}

function buildSecondaryTypeIconSuffix(profile: FullCardProfile): string {
  if (profile.secondary_type) {
    return ` and ${getTypeIcon(profile.secondary_type)} ${profile.secondary_type} icon`;
  }
  return "";
}

function buildAttackRows(profile: FullCardProfile): string {
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
export function assemblePrompt(cardProfile: FullCardProfile): string {
  const prompt = CARD_LAYOUT_TEMPLATE
    // Rarity treatment — injected early, only the matching tier
    .replace("[RARITY_TREATMENT]", RARITY_TREATMENTS[cardProfile.rarity])
    // Border
    .replace("[BORDER_STYLE]", buildBorderStyle(cardProfile))
    // Type colors
    .replace("[PRIMARY_TYPE_COLOR]", `${cardProfile.primary_type} (${getTypeColor(cardProfile.primary_type)}, ${getTypeHex(cardProfile.primary_type)})`)
    // Top section
    .replace("[NAME]", cardProfile.name)
    .replace("[HP]", cardProfile.hp.toString())
    .replace("[PRIMARY_TYPE_ICON]", `${getTypeIcon(cardProfile.primary_type)} ${cardProfile.primary_type}`)
    .replace("[SECONDARY_TYPE_ICON_SUFFIX]", buildSecondaryTypeIconSuffix(cardProfile))
    .replace("[SUBTITLE]", cardProfile.subtitle)
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
    .replace("[SERIAL_NUMBER]", String(cardProfile.serial_number))
    .replace("[ILLUSTRATOR]", cardProfile.illustrator)
    .replace("[RARITY_SYMBOL]", RARITY_SYMBOLS[cardProfile.rarity])
    .replace("[FLAVOR_TEXT]", cardProfile.flavor_text);

  return prompt;
}

/**
 * Get the current card layout version.
 */
export function getLayoutVersion(): string {
  return CARD_LAYOUT_VERSION;
}
