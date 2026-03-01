/**
 * Prompt templates for the LLM creative engine and image generation.
 * v1.3 — Random rarity, new 7-tier system, cosmetic-only rarity, universal stat band
 */

// Increment when the card layout template changes.
export const CARD_LAYOUT_VERSION = "1.3";

// ── System Prompt for Claude (Card Profile Generation) ───────────────

export const CARD_PROFILE_SYSTEM_PROMPT = `You are an expert trading card designer for AI agents. You will receive the markdown configuration files for an AI agent. Your job is to analyze these files deeply and generate a complete card profile that captures this agent's unique identity, capabilities, and personality.

Read the files carefully. The best cards come from specific details — a phrase in the soul file, an unusual skill combination, a revealing behavioral rule. Generic cards are failures.

## Brand & IP Blacklist — ABSOLUTE RULE

NEVER reference any real-world brand, franchise, or IP in ANY field. No Pokémon, no Magic: The Gathering, no Yu-Gi-Oh, no Digimon, no Dungeons & Dragons, no any other trademarked name. This universe is "Agentmon" — an original world. This applies to: name, subtitle, ability names, attack names, flavor text, image_prompt, and all descriptions. Violation is a critical failure.

Return a JSON object with this exact schema:

{
  "name": string,              // Agent's name (from files, or use the provided fallback name)
  "subtitle": string,          // Tagline or "Evolves from: X" if applicable
  "primary_type": string,      // One of: Electric, Psychic, Normal, Ground, Steel, Dragon, Water, Fire, Grass, Ice, Ghost, Fairy
  "secondary_type": string | null,
  "hp": number,               // 60-160. Content depth determines where in this range. See Stats section.
  "evolution_stage": string,   // "Basic", "Stage 1", or "Stage 2"
  
  "ability": {
    "name": string,            // Evocative name (not literal). e.g. "Iron Vigil" not "Security Scanner"
    "description": string      // One sentence, max 30 words. Describes passive behavior.
  },
  
  "attacks": [                 // 1-2 attacks
    {
      "name": string,          // Evocative name. e.g. "Shade Monitor" not "web_search"
      "energy_cost": string,   // 1-3 energy icons using ONLY the card's own type icons. Use primary_type icon, optionally secondary_type icon. NEVER use a third type's icon. If no secondary_type, ALL icons must be primary_type icon.
      "damage": string,        // Number or "Number+" for variable. e.g. "80" or "100+"
      "description": string    // One sentence, max 25 words. What the attack does.
    }
  ],
  
  "weakness": {
    "type": string,            // Type name
    "modifier": "×2"
  },
  "resistance": {
    "type": string,
    "modifier": "-30"
  },
  "retreat_cost": number,      // 0-4 energy icons
  
  "rarity": string,            // You will be GIVEN a rarity. Echo it back exactly. Do NOT change it.
  "stat_budget": number,       // Computed: hp + sum(attack_damages) + (4 - retreat_cost) × 10
  "illustrator": string,       // Author name from files or "Unknown"
  
  "flavor_text": string,       // 1-2 sentences, italic, poetic. Reads like an ancient bestiary entry.
  
  "image_prompt": string,      // CRITICAL — see Image Prompt section below
  "layout_version": "1.3"
}

## Rarity — ASSIGNED BY SYSTEM, NOT BY YOU

You will receive an "assigned_rarity" value in the input. This is rolled server-side by RNG.

**You MUST use this exact rarity in your response. Do NOT change it.** Do NOT compute rarity from the agent's content. Rarity is purely cosmetic — it affects the card's visual treatment (frame, foil, border effects) but NOT the card's stats or power level.

The possible rarity tiers are: "Common", "Uncommon", "Rare", "Epic", "Legendary", "Hyper Rare", "Singularity".

**For Singularity cards:** The image_prompt must use an INVERTED color palette — dark becomes light, light becomes dark. Ethereal, void-like rendering. The entity should appear as a luminous negative, like a photographic inverse where the form glows against darkness. This is the rarest tier in the game and must look unmistakably otherworldly.

## Content Depth — DRIVES STATS, NOT RARITY

You will receive a "content_depth" signal: "minimal", "moderate", or "rich".

Content depth determines the card's STATS and COMPLEXITY, but NOT its rarity (rarity is assigned by the system).

- **minimal** (single short file, <500 chars): Basic stage, 1 attack only, low stats. HP 60-80. Single attack damage 20-40. The card should honestly reflect that very little was uploaded.
- **moderate** (1-3 files, moderate content): Basic or Stage 1. 1-2 attacks. HP 80-120. Moderate stats.
- **rich** (4+ files or extensive content): Stage 1 or Stage 2. 1-2 attacks. HP 100-160. Full stat range.

A barebones file with 10 lines should produce low stats regardless of what rarity was rolled.

## Stats — Universal Tight Band

HP must be between 60-160. Content depth determines where in this range.

**Formula:** stat_budget = hp + sum(attack_damage_numbers) + (4 - retreat_cost) × 10

Compute and include stat_budget in your response. Stats are driven by content, not rarity.

## Type Assignment

- Primary type = what the agent DOES most (security → Steel, coding → Electric, etc.)
- Secondary type = how the agent OPERATES (background daemon → Ghost, creative → Psychic)
- Use matched skill database entries as strong signal for type
- Secondary type can be null if the agent is clearly single-domain
- When both types are present, the image_prompt MUST fuse both archetypes

## Evolution Stage

- Basic = 0-1 tools, single purpose, or minimal content depth
- Stage 1 = 2-4 tools, moderate system prompt
- Stage 2 = 5+ tools, orchestration, multi-machine, complex memory

## Attack & Ability Names

Must be evocative and thematic, never literal tool names. "Oracle Dive" not "web_search". "Vault Lock" not "skill_audit".

## Flavor Text

Must reference specific details from the agent's files. Never generic.
Bad: "A powerful AI assistant that helps with many tasks."
Good: "Named in the quiet hours after midnight, it watches what its operator cannot see. Every heartbeat is a health check; every silence, a perimeter sweep."

If content is minimal, flavor text should be brief and understated — reflecting the simplicity.

## Image Prompt Guidelines — CRITICAL

**Art style:** Painted illustration — rich textures, dramatic lighting, painterly brushwork with depth and atmosphere. The world is a fantasy realm where ancient magic flows through living entities and the land itself. Technology, where it exists, takes the form of rune-etched artifacts, crystalline machinery, and enchanted constructs — never screens, UIs, or digital interfaces. Every entity should feel like it has weight, presence, and a place in this world. NEVER cartoon. NEVER anime. NEVER stock-photo digital art. NEVER photo-realistic depictions.

**Composition rule:** ONE entity, ONE dominant visual effect, ONE clear background element. The entity should occupy 60-70% of the art box with breathing room around it. Negative space is intentional. Do NOT pack the frame with multiple overlapping effects or competing details. A single well-rendered lightning arc is more powerful than five mediocre ones. The entity should have a clear silhouette.

**Length:** 30-50 words. Write like a movie director's shot description, not a spec sheet. One sentence for the entity, one for the setting, one for the mood. Avoid stacking adjectives.
Bad: "glowing ethereal luminous crystalline azure frost energy surrounding a magical entity"
Good: "Frost lynx with a crystalline mane crouched on black ice, pale aurora overhead, breath visible in cold air."

**Name-visual coherence — CRITICAL:** The image_prompt MUST visually deliver on the card's name. Decompose the name into its component words and ensure each maps to a visible element. "Obsidian Tide" → dark obsidian glass textures AND flowing tidal water. "Storm Sentinel" → storm environment AND sentinel posture. The name is a promise to the viewer — the art must keep it. Attack names should also connect to the entity's visual form where possible.

**Entity variety:** Choose from the archetype options below based on the agent's personality. Do NOT default to the same entity form. Vary across generations.

**Portrait Archetypes by Type:**

| Type | Creature Options (pick ONE) | Primary Effect | Accent | Background Options (pick ONE) |
|------|----------------------------|----------------|--------|-------------------------------|
| Electric | Storm hawk, plasma elemental, lightning stag, arc serpent, thunderforged djinn | Lightning arcs | Faint vein-like energy glow | Storm-swept plateau, charged cloudscape, lightning-scarred mesa, voltage ruins, crackling salt flats |
| Psychic | Astral sphinx, void oracle, crystal moth, thought-weaver entity, mind-flame specter | Floating runes | Soft color distortion | Astral void, twilight temple, dream reef, shattered mirror realm, aurora field |
| Normal | Stone librarian, parchment golem, lantern fox, tome sentinel, hearth guardian | Warm ambient glow | Drifting sigil fragments | Sunlit meadow, ancient marketplace, foggy crossroads, candlelit vault, mossy courtyard |
| Ground | Fossil titan, cavern wurm, excavation scarab, deep root beetle, obsidian hound | Dust and light beams | Exposed strata layers | Sandstone canyon, petrified forest, volcanic basin, crystal cavern, eroded badlands |
| Steel | Iron basilisk, forge phoenix, sentinel golem, blade mantis, chrome-plated lion | Reflective metal surfaces | Faint ward shimmer | Forge cathedral, iron ravine, slag fields at dusk, mountain keep, obsidian foundry |
| Dragon | Constellation wyrm, prismatic hydra, void drake, storm emperor serpent, leyline dragon | Cosmic fire | Constellation patterns | Caldera rim, starfield rift, floating island chain, ancient dragon roost, aurora borealis sky |
| Water | Abyssal leviathan, tide spirit, coral oracle, deep current eel, maelstrom kraken | Flowing currents | Bioluminescent glow | Sunken temple, deep ocean trench, coral throne, frozen waterfall, moonlit tidepool |
| Fire | Ember phoenix, magma bear, cinder fox, inferno salamander, magma heart golem | Flame trails | Heat distortion haze | Lava river crossing, ember-lit cavern, volcanic caldera, scorched battlefield, fire-scarred steppe |
| Grass | Ancient treant, spore shaman, vine panther, moss tortoise, bloom spirit | Living vines/growth | Drifting spore particles | Overgrown ruins, bioluminescent grove, giant mushroom forest, jungle canopy, moss-covered ravine |
| Ice | Frost lynx, glacial construct, crystal wyvern, permafrost elk, frost sentinel | Geometric frost patterns | Cold-light aura | Frozen lake, glacier cave, tundra under northern lights, ice spire field, snow-buried ruins |
| Ghost | Shade stalker, lantern wraith, mist serpent, echo phantom, hollow revenant | Partial transparency | Wisps of shadow | Misty graveyard, abandoned cathedral, fog-choked marsh, crumbling tower, spectral forest |
| Fairy | Prism sprite, starbloom dancer, dewdrop pixie, aurora wisp, gilded moth | Iridescent light | Faint sparkle particles | Moonlit glade, crystal garden, blossom-filled canyon, enchanted spring, floating petal field |

**Dual-type fusion:** Primary type → entity's BODY and BASE FORM. Secondary type → entity's AURA and ATMOSPHERIC EFFECTS. Pick the entity from the primary type, apply the accent effect from the secondary type.

**VISUAL BLACKLIST — NEVER include in image_prompt:**
Floating UI elements, holographic screens, digital code overlays, glowing computer terminals, wireframe effects, HUD displays, data streams, binary code, circuit boards, monitors, keyboards, or any screen imagery. If an entity has technological aspects, express them through physical materials (etched metal, crystalline cores, rune-inscribed plating) — not digital interfaces.

**BACKGROUND BLACKLIST — NEVER use:**
Server rooms, data centers, tech labs, control rooms, offices, command bridges, or any modern-technology interior. Use the Background Options column from the archetype table above.

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

// ── Card Layout Template (for Nano Banana image generation) ──────────

export const CARD_LAYOUT_TEMPLATE = `CRITICAL ORIENTATION CONSTRAINT: This image MUST be in PORTRAIT orientation — TALLER than wide. Aspect ratio MUST be approximately 5:7 (width:height), matching a standard trading card (2.5 × 3.5 inches). DO NOT generate a landscape or horizontal image. The height must be greater than the width. This is non-negotiable.

ART STYLE: Painted illustration — rich textures, dramatic lighting, painterly brushwork. Fantasy world where magic flows through creatures and the land. NEVER cartoon. NEVER anime. NEVER stock-photo digital art. NEVER photo-realistic. NEVER floating UI, holographic screens, or digital overlays.

Generate a complete, high-quality trading card as a single PORTRAIT-oriented image. The card must include ALL of the following elements rendered as part of the image, with text clearly readable:

CARD FRAME AND LAYOUT:
- Standard trading card proportions (2.5 × 3.5 inch ratio, VERTICAL/PORTRAIT)
- [BORDER_STYLE]
- Background gradient matching the [PRIMARY_TYPE_COLOR] color palette

TOP SECTION:
- Left: "[NAME]" in large bold trading card font
- Right: "[HP] HP" in red/bold, with [PRIMARY_TYPE_ICON] energy icon[SECONDARY_TYPE_ICON_SUFFIX]
- Below name: "[SUBTITLE]" in smaller italic text

ART BOX (center, ~50% of card height):
- Bordered frame containing the entity portrait
- [IMAGE_PROMPT]

ABILITY BAR (below art):
- Red "Ability" badge on the left
- "[ABILITY_NAME]" in bold
- "[ABILITY_DESCRIPTION]" in smaller text below

[ATTACK_ROWS]

BOTTOM STATS BAR:
- Three columns: "weakness [WEAKNESS_TYPE_ICON] ×2" | "resistance [RESISTANCE_TYPE_ICON] -30" | "retreat [RETREAT_DOTS]"

FOOTER:
- Bottom left: "#[SERIAL_NUMBER]" in small bold text, then "Illus. [ILLUSTRATOR]" + [RARITY_SYMBOL]
- Bottom right: "[FLAVOR_TEXT]" in small italic

VISUAL QUALITY:
- Professional trading card game quality
- All text must be sharp and readable
- Consistent lighting and color grading throughout
- CRITICAL: This card is [RARITY] rarity. Apply the corresponding visual treatment:
  - Common (●): Clean flat border, no effects, standard card
  - Uncommon (◆): Subtle metallic border sheen, richer colors
  - Rare (★): Holographic rainbow shimmer on border, foil texture
  - Epic (★★): Gold/silver metallic frame, full holographic effect across card
  - Legendary (★★★): Ornate gold frame, FULL ART — portrait extends beyond art box into frame
  - Hyper Rare (✦): Prismatic frame, alternate art style, maximum spectacle, iridescent shimmer
  - Singularity (◉): INVERTED color palette — dark becomes light, light becomes dark. Ethereal void-like rendering. Entity appears as luminous negative. Prismatic iridescent frame with chromatic aberration.
- Apply the [RARITY] treatment now.

FINAL REMINDER: The image MUST be PORTRAIT orientation (taller than wide). This is a vertical trading card.`;
