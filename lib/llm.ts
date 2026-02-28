import Anthropic from "@anthropic-ai/sdk";
import { CardProfileSchema, type CardProfile, type SkillEntry, type ContentDepth } from "./types";
import { CARD_PROFILE_SYSTEM_PROMPT, STAT_BUDGET_RANGES } from "./prompt-template";

// ── Stat Budget Utilities ────────────────────────────────────────────

function parseDamageNumber(damage: string): number {
  // "100+" → 100, "80" → 80, "30×2" → 60
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

function clampStatBudget(profile: CardProfile): CardProfile {
  const range = STAT_BUDGET_RANGES[profile.rarity];
  if (!range) return profile;

  const currentBudget = computeStatBudget(profile);

  // If within range, just update the stat_budget field
  if (currentBudget >= range.min && currentBudget <= range.max) {
    return { ...profile, stat_budget: currentBudget };
  }

  // Need to clamp — scale HP and attack damages proportionally
  const targetBudget = currentBudget > range.max ? range.max : range.min;
  const retreatValue = (4 - profile.retreat_cost) * 10;
  const availableForStats = targetBudget - retreatValue;

  // Calculate current proportions
  const totalAttackDamage = profile.attacks.reduce(
    (sum, atk) => sum + parseDamageNumber(atk.damage),
    0
  );
  const totalStats = profile.hp + totalAttackDamage;

  if (totalStats === 0) return { ...profile, stat_budget: targetBudget };

  const ratio = availableForStats / totalStats;

  // Scale HP
  const newHp = Math.max(40, Math.min(200, Math.round(profile.hp * ratio)));

  // Scale attacks
  const newAttacks = profile.attacks.map((atk) => {
    const baseDmg = parseDamageNumber(atk.damage);
    const newDmg = Math.max(10, Math.round(baseDmg * ratio));
    const suffix = atk.damage.includes("+") ? "+" : "";
    return { ...atk, damage: `${newDmg}${suffix}` };
  });

  const clamped = { ...profile, hp: newHp, attacks: newAttacks };
  const finalBudget = computeStatBudget(clamped);

  return { ...clamped, stat_budget: finalBudget };
}

// ── Build the user message for Claude ────────────────────────────────

function buildUserMessage(
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
  }
): string {
  let message = `## Agent Configuration Files\n\n${rawText}\n\n`;

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
  message += `- Content depth is "${parsedSignals.content_depth}" — match card power accordingly\n`;
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
  }
): Promise<CardProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.includes("PLACEHOLDER")) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env.local"
    );
  }

  const client = new Anthropic({ apiKey });

  const userMessage = buildUserMessage(rawText, matchedSkills, parsedSignals);

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

  const result = CardProfileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Card profile validation failed: ${JSON.stringify(result.error.issues, null, 2)}\n\nRaw JSON:\n${JSON.stringify(parsed, null, 2).slice(0, 500)}`
    );
  }

  // Apply stat budget clamping
  const clamped = clampStatBudget(result.data);

  return clamped;
}
