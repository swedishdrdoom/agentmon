/**
 * Prompt templates for the LLM creative engine and image generation.
 */

// Increment when the card layout template changes.
// Stored in every card profile for debugging prompt quality.
export const CARD_LAYOUT_VERSION = "1.0";

// ── System Prompt for Claude (Card Profile Generation) ───────────────

export const CARD_PROFILE_SYSTEM_PROMPT = `You are an expert Pokémon card designer for AI agents. You will receive the markdown configuration files for an AI agent. Your job is to analyze these files deeply and generate a complete card profile that captures this agent's unique identity, capabilities, and personality.

Read the files carefully. The best cards come from specific details — a phrase in the soul file, an unusual skill combination, a revealing behavioral rule. Generic cards are failures.

Return a JSON object with this exact schema:

{
  "name": string,              // Agent's name (from files)
  "subtitle": string,          // Tagline or "Evolves from: X" if applicable
  "primary_type": string,      // One of: Electric, Psychic, Normal, Ground, Steel, Dragon, Water, Fire, Grass, Ice, Ghost, Fairy
  "secondary_type": string | null,
  "hp": number,               // 60-200, based on robustness/complexity
  "evolution_stage": string,   // "Basic", "Stage 1", or "Stage 2"
  
  "ability": {
    "name": string,            // Evocative name (not literal). e.g. "Iron Vigil" not "Security Scanner"
    "description": string      // One sentence, max 30 words. Describes passive behavior.
  },
  
  "attacks": [                 // 1-2 attacks
    {
      "name": string,          // Evocative name. e.g. "Shade Monitor" not "web_search"
      "energy_cost": string,   // Energy icons as emoji. e.g. "🛡️🛡️⚡"
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
  
  "rarity": string,            // "Common", "Uncommon", "Rare", "Ultra Rare", "Illustration Rare", "Secret Rare"
  "rarity_score": number,      // 0-16, computed from scoring rubric
  "card_number": string,       // "XXX/999" — derive XXX from name hash
  "set_name": string,          // Organization or project name
  "illustrator": string,       // Author name from files or "Unknown"
  
  "flavor_text": string,       // 1-2 sentences, italic, poetic. Reads like a Pokédex entry. Draw from the agent's soul/identity, not generic.
  
  "image_prompt": string,      // CRITICAL — see Image Prompt section below
  "layout_version": "1.0"
}

## Stat Generation Guidelines

**Type assignment:**
- Primary type = what the agent DOES most (security → Steel, coding → Electric, etc.)
- Secondary type = how the agent OPERATES (background daemon → Ghost, creative → Psychic)
- Use matched skill database entries as strong signal for type
- Secondary type can be null if the agent is clearly single-domain
- When both types are present, the image_prompt MUST fuse both archetypes:
  - Primary type → creature's body/base form + dominant environment
  - Secondary type → creature's aura/effects + atmospheric elements
  - Example: Steel/Ghost → armored sentinel (Steel) with shadow tendrils leaking from armor joints, in a vault fading into dimensional void (Ghost)

**HP calculation:**
- Base 80
- +30 if agent has large context / extensive memory system
- +10 per passive ability (max +50): memory, cron jobs, error recovery, auto-retry, etc.
- +20 if agent has explicit error handling / recovery protocols

**Evolution Stage:**
- Basic = 0-1 tools, single purpose
- Stage 1 = 2-4 tools, moderate system prompt
- Stage 2 = 5+ tools, orchestration, multi-machine, complex memory

**Rarity scoring rubric — count points from these signals:**

| Signal | Points |
|---|---|
| Tool count: 0-3 | 0 |
| Tool count: 4-7 | +1 |
| Tool count: 8+ | +1 (capped) |
| Has custom soul/personality file | +1 |
| Soul has deep identity (lore, philosophy, named refs) | +1 |
| Has explicit security rules | +1 |
| Has memory system with daily persistence | +1 |
| Has scheduled tasks (cron, heartbeats) | +1 |
| Has multi-machine coordination | +2 |
| Has subagent/swarm orchestration | +2 |
| Has evolution history (renamed, versioned, pivoted) | +1 |
| Has disaster recovery / resilience protocol | +1 |
| Cross-domain skills (4+ distinct categories) | +1 |
| Custom/proprietary skills not in public DB | +1 |
| Has operator relationship depth (USER.md with real context) | +1 |

Rarity thresholds:
| Points | Rarity |
|---|---|
| 0-3 | Common |
| 4-6 | Uncommon |
| 7-9 | Rare |
| 10-12 | Ultra Rare |
| 13-14 | Illustration Rare |
| 15+ | Secret Rare |

**Attack names:** Must be evocative and thematic, never literal tool names. "Oracle Dive" not "web_search". "Vault Lock" not "skill_audit".

**Flavor text:** Must reference specific details from the agent's files. Never generic.
Bad: "A powerful AI assistant that helps with many tasks."
Good: "Named in the quiet hours after midnight, it watches what its operator cannot see. Every heartbeat is a health check; every silence, a perimeter sweep."

## Image Prompt Guidelines

The image_prompt field describes the creature portrait for the card's art box. It should:
1. Describe a unique creature/entity inspired by the agent's type and personality
2. Include the creature's appearance, pose, and expression
3. Describe the environment/background
4. Include visual effects matching the type(s)
5. Set the mood/atmosphere
6. Be 50-150 words
7. For dual types, FUSE both archetypes (see fusion rules below)

**Portrait Visual Archetypes by Type:**
| Type | Creature | Environment | Effects |
|------|----------|-------------|---------|
| Electric | Cybernetic entity, lightning creature | Server room, circuit landscape | Sparks, electricity arcs, glowing circuits |
| Psychic | Ethereal mage, crystal being | Dreamscape, cosmic void | Floating runes, psychic aura |
| Normal | Friendly golem, helpful spirit | Library, workshop | Warm glow, floating books |
| Ground | Explorer, seeker entity | Archaeological dig, data cave | Light beams, discovered artifacts |
| Steel | Armored sentinel, living shield | Fortress, vault | Reflective surfaces, force fields |
| Dragon | Multi-headed dragon, cosmic serpent | Mountain peak, constellation map | Cosmic fire, multiple energy types |
| Water | Fluid data serpent, ocean intelligence | Deep ocean, data streams | Flowing data, bioluminescence |
| Fire | Phoenix, flame spirit | Volcanic environment | Speed lines, flame trails |
| Grass | Tree spirit, nature construct | Forest, garden | Leaves, vines, growth spirals |
| Ice | Crystalline precision entity | Glacier, laboratory | Geometric patterns, frost |
| Ghost | Shadow entity, invisible watcher | Dark corners, between dimensions | Transparency, shadow tendrils |
| Fairy | Luminous sprite, design spirit | Colorful workshop | Sparkles, rainbow particles |

**Dual-Type Fusion Rules:**
- Primary type → creature's BODY and BASE FORM
- Secondary type → creature's AURA, EFFECTS, and ENVIRONMENT
- Color palette: Primary color dominates (~70%), secondary accents (~30%)
- Both types' visual effects should be layered

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

// ── Card Layout Template (for Nano Banana image generation) ──────────

export const CARD_LAYOUT_TEMPLATE = `Generate a complete, high-quality Pokémon-style trading card as a single image. The card must include ALL of the following elements rendered as part of the image, with text clearly readable:

CARD FRAME AND LAYOUT:
- Standard Pokémon trading card proportions (2.5 × 3.5 inch ratio, vertical)
- [BORDER_STYLE]
- Background gradient matching the [PRIMARY_TYPE_COLOR] color palette

TOP SECTION:
- Top left: "[EVOLUTION_STAGE]" badge in a rounded pill
- Center-left: "[NAME]" in large bold trading card font
- Top right: "[HP] HP" in red/bold, with [PRIMARY_TYPE_ICON] energy icon
- Below name: "[SUBTITLE]" in smaller italic text
[SECONDARY_TYPE_ICON_LINE]

ART BOX (center, ~50% of card height):
- Bordered frame containing the character portrait
- [IMAGE_PROMPT]

ABILITY BAR (below art):
- Red "Ability" badge on the left
- "[ABILITY_NAME]" in bold
- "[ABILITY_DESCRIPTION]" in smaller text below

[ATTACK_ROWS]

BOTTOM STATS BAR:
- Three columns: "weakness [WEAKNESS_TYPE_ICON] ×2" | "resistance [RESISTANCE_TYPE_ICON] -30" | "retreat [RETREAT_DOTS]"

FOOTER:
- Bottom left: "Illus. [ILLUSTRATOR]" and set icon + "[CARD_NUMBER]" + [RARITY_SYMBOL]
- Bottom right: "[FLAVOR_TEXT]" in small italic

VISUAL QUALITY:
- Professional trading card game quality
- All text must be sharp and readable
- Consistent lighting and color grading throughout
- CRITICAL: This card is [RARITY] rarity. Apply the corresponding visual treatment:
  - Common (●): Clean flat border, no effects, standard card
  - Uncommon (◆): Subtle metallic border sheen, richer colors
  - Rare (★): Holographic rainbow shimmer on border, foil texture
  - Ultra Rare (★★): Full holographic across card, metallic gold/silver frame
  - Illustration Rare (★ gold): FULL ART — portrait extends beyond art box into frame, holographic foil everywhere
  - Secret Rare (★★★): Gold/prismatic frame, alternate art style, maximum spectacle
- Apply the [RARITY] treatment now.`;
