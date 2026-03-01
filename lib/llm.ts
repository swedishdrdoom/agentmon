import Anthropic from "@anthropic-ai/sdk";
import { CardProfileSchema, TYPE_METADATA, type CardProfile, type CardType, type Rarity, type SkillEntry, type ContentDepth } from "./types";
import { CARD_PROFILE_SYSTEM_PROMPT } from "./prompt-template";
import { hasExpandedVariance } from "./rarity";

// ── Exported Pure Helpers (for testing) ───────────────────────────────
// These are also used internally by generateCardProfile().

export { sanitizeBrandNames, enforceEnergyCost, parseDamageNumber, computeStatBudget, clampStats };

// ── Brand Name Sanitization ──────────────────────────────────────────

const BRAND_BLACKLIST = [
  "pokemon", "pokémon", "pokédex", "pokedex", "pikachu", "charizard",
  "magic: the gathering", "magic the gathering", "mtg",
  "yu-gi-oh", "yugioh", "yu gi oh",
  "digimon", "dungeons & dragons", "dungeons and dragons", "d&d",
  "nintendo", "game freak", "wizards of the coast",
  "hearthstone", "blizzard", "keyforge",
];

/**
 * Scans all text fields in a card profile for brand references.
 * Removes offending words in-place. This is a safety net — the LLM
 * prompt already forbids brand names, but we enforce it in code too.
 */
function sanitizeBrandNames(profile: CardProfile): CardProfile {
  const fieldsToCheck: (keyof CardProfile)[] = [
    "name", "subtitle", "flavor_text", "image_prompt", "illustrator",
  ];

  let patched = { ...profile };

  for (const field of fieldsToCheck) {
    let value = patched[field];
    if (typeof value !== "string") continue;

    for (const brand of BRAND_BLACKLIST) {
      const regex = new RegExp(brand, "gi");
      value = value.replace(regex, "").replace(/\s{2,}/g, " ").trim();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (patched as any)[field] = value;
  }

  // Check ability name & description
  patched = {
    ...patched,
    ability: {
      name: stripBrands(patched.ability.name),
      description: stripBrands(patched.ability.description),
    },
  };

  // Check attack names & descriptions
  patched = {
    ...patched,
    attacks: patched.attacks.map((atk) => ({
      ...atk,
      name: stripBrands(atk.name),
      description: stripBrands(atk.description),
    })),
  };

  return patched;
}

function stripBrands(text: string): string {
  let result = text;
  for (const brand of BRAND_BLACKLIST) {
    const regex = new RegExp(brand, "gi");
    result = result.replace(regex, "").replace(/\s{2,}/g, " ").trim();
  }
  return result;
}

// ── Energy Cost Enforcement ──────────────────────────────────────────

/**
 * Ensures attack energy_cost icons only use the card's primary and
 * (optionally) secondary type icons. Replaces any invalid icons with
 * the primary type icon, and caps total icons at 3 per attack.
 */
function enforceEnergyCost(profile: CardProfile): CardProfile {
  const primaryIcon = TYPE_METADATA[profile.primary_type].icon;
  const secondaryIcon = profile.secondary_type
    ? TYPE_METADATA[profile.secondary_type].icon
    : null;

  // Build set of all valid type icons for comparison
  const validIcons = new Set<string>([primaryIcon]);
  if (secondaryIcon) validIcons.add(secondaryIcon);

  // All possible type icons for detection
  const allTypeIcons = Object.values(TYPE_METADATA).map((m) => m.icon);

  const newAttacks = profile.attacks.map((atk) => {
    // Extract individual emoji icons from the energy_cost string
    const icons: string[] = [];
    for (const typeIcon of allTypeIcons) {
      let remaining = atk.energy_cost;
      while (remaining.includes(typeIcon)) {
        icons.push(typeIcon);
        remaining = remaining.replace(typeIcon, "");
      }
    }

    // If we couldn't parse any icons, default to 1-2 primary icons
    if (icons.length === 0) {
      return { ...atk, energy_cost: primaryIcon.repeat(1) };
    }

    // Replace invalid icons with primary, cap at 3
    const corrected = icons
      .slice(0, 3)
      .map((icon) => (validIcons.has(icon) ? icon : primaryIcon));

    return { ...atk, energy_cost: corrected.join("") };
  });

  return { ...profile, attacks: newAttacks };
}

// ── Stat Utilities ───────────────────────────────────────────────────

function parseDamageNumber(damage: string): number {
  // "100+" → 100, "80" → 80, "30×2" → 30 (leading integer only)
  const match = damage.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function computeStatBudget(profile: CardProfile): number {
  const totalAttackDamage = profile.attacks.reduce(
    (sum, atk) => sum + parseDamageNumber(atk.damage),
    0
  );
  const retreatValue = (4 - profile.retreat_cost) * 10;
  return profile.hp + totalAttackDamage + retreatValue;
}

/**
 * Clamps HP to the universal tight band and recomputes stat_budget.
 * Standard tiers: 60-160 HP. Hyper Rare / Singularity: 50-180 HP.
 */
function clampStats(profile: CardProfile): CardProfile {
  const expanded = hasExpandedVariance(profile.rarity);
  const hpMin = expanded ? 50 : 60;
  const hpMax = expanded ? 180 : 160;

  const clampedHp = Math.max(hpMin, Math.min(hpMax, profile.hp));
  const result = { ...profile, hp: clampedHp };
  result.stat_budget = computeStatBudget(result);

  return result;
}

// ── Build the user message for Claude ────────────────────────────────

function buildUserMessage(
  rawText: string,
  matchedSkills: SkillEntry[],
  assignedRarity: Rarity,
  parsedSignals: {
    file_names: string[];
    agent_name: string | null;
    has_security_rules: boolean;
    has_cron_tasks: boolean;
    has_memory_system: boolean;
    has_subagent_orchestration: boolean;
    has_multi_machine_setup: boolean;
    tool_count: number;
    content_depth: ContentDepth;
    total_content_length: number;
    file_count: number;
  }
): string {
  let message = `## Agent Configuration Files\n\n${rawText}\n\n`;

  message += `## Assigned Rarity — DO NOT CHANGE\n`;
  message += `This card's rarity is: "${assignedRarity}"\n`;
  message += `Use this EXACT rarity in your JSON response. Do NOT change it based on content depth or agent complexity. Rarity is cosmetic only.\n\n`;

  message += `## Parser Signals\n`;
  message += `- Files uploaded: ${parsedSignals.file_names.join(", ")}\n`;
  message += `- File count: ${parsedSignals.file_count}\n`;
  message += `- Total content length: ${parsedSignals.total_content_length} characters\n`;
  message += `- Content depth: **${parsedSignals.content_depth}**\n`;
  message += `- Tool count: ${parsedSignals.tool_count}\n`;
  message += `- Has security rules: ${parsedSignals.has_security_rules}\n`;
  message += `- Has cron/scheduled tasks: ${parsedSignals.has_cron_tasks}\n`;
  message += `- Has memory system: ${parsedSignals.has_memory_system}\n`;
  message += `- Has subagent orchestration: ${parsedSignals.has_subagent_orchestration}\n`;
  message += `- Has multi-machine setup: ${parsedSignals.has_multi_machine_setup}\n\n`;

  if (parsedSignals.agent_name) {
    message += `## Agent Name\nUse this name for the card: "${parsedSignals.agent_name}"\n\n`;
  }

  if (matchedSkills.length > 0) {
    message += `## Matched Skills from Database (${matchedSkills.length} skills)\n\n`;
    for (const skill of matchedSkills) {
      message += `- **${skill.name}** (${skill.category} → ${skill.primary_type}, complexity: ${skill.complexity}): ${skill.description}\n`;
    }
    message += `\n`;
  } else {
    message += `## Matched Skills\nNo skills matched the public database. The agent may use custom/proprietary skills.\n\n`;
  }

  message += `Generate the card profile JSON now. Remember:\n`;
  message += `- Rarity is "${assignedRarity}" — use it exactly, do not change it\n`;
  message += `- Content depth is "${parsedSignals.content_depth}" — match card STATS accordingly (not rarity)\n`;
  message += `- Compute and include stat_budget in your response\n`;
  message += `- Return ONLY valid JSON, no markdown code blocks.`;

  return message;
}

// ── Call Claude API ──────────────────────────────────────────────────

export async function generateCardProfile(
  rawText: string,
  matchedSkills: SkillEntry[],
  parsedSignals: {
    file_names: string[];
    agent_name: string | null;
    has_security_rules: boolean;
    has_cron_tasks: boolean;
    has_memory_system: boolean;
    has_subagent_orchestration: boolean;
    has_multi_machine_setup: boolean;
    tool_count: number;
    content_depth: ContentDepth;
    total_content_length: number;
    file_count: number;
  },
  assignedRarity: Rarity
): Promise<CardProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.includes("PLACEHOLDER")) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env.local"
    );
  }

  const client = new Anthropic({ apiKey });

  const userMessage = buildUserMessage(rawText, matchedSkills, assignedRarity, parsedSignals);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: CARD_PROFILE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonText = textBlock.text.trim();

  // Strip markdown code blocks if Claude wraps them anyway
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      `Failed to parse Claude response as JSON: ${(e as Error).message}\n\nRaw response:\n${jsonText.slice(0, 500)}`
    );
  }

  // Add stat_budget if Claude forgot it
  if (typeof parsed === "object" && parsed !== null && !("stat_budget" in parsed)) {
    (parsed as Record<string, unknown>).stat_budget = 0;
  }

  // Strip fields that the LLM may still generate from old prompt versions.
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    delete obj.card_number;
    delete obj.set_name;
    delete obj.rarity_score;
  }

  // Force-override rarity to match the server-side roll (in case Claude changed it)
  if (typeof parsed === "object" && parsed !== null) {
    (parsed as Record<string, unknown>).rarity = assignedRarity;
  }

  const result = CardProfileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Card profile validation failed: ${JSON.stringify(result.error.issues, null, 2)}\n\nRaw JSON:\n${JSON.stringify(parsed, null, 2).slice(0, 500)}`
    );
  }

  // Apply post-processing pipeline
  const clamped = clampStats(result.data);
  const sanitized = sanitizeBrandNames(clamped);
  const enforced = enforceEnergyCost(sanitized);

  return enforced;
}
