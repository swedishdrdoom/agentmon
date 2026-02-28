import Anthropic from "@anthropic-ai/sdk";
import { CardProfileSchema, type CardProfile, type SkillEntry } from "./types";
import { CARD_PROFILE_SYSTEM_PROMPT } from "./prompt-template";

// ── Build the user message for Claude ────────────────────────────────

function buildUserMessage(
  rawText: string,
  matchedSkills: SkillEntry[],
  parsedSignals: {
    file_names: string[];
    has_security_rules: boolean;
    has_cron_tasks: boolean;
    has_memory_system: boolean;
    has_subagent_orchestration: boolean;
    has_multi_machine_setup: boolean;
    tool_count: number;
  }
): string {
  let message = `## Agent Configuration Files\n\n${rawText}\n\n`;

  message += `## Parser Signals\n`;
  message += `- Files uploaded: ${parsedSignals.file_names.join(", ")}\n`;
  message += `- Tool count: ${parsedSignals.tool_count}\n`;
  message += `- Has security rules: ${parsedSignals.has_security_rules}\n`;
  message += `- Has cron/scheduled tasks: ${parsedSignals.has_cron_tasks}\n`;
  message += `- Has memory system: ${parsedSignals.has_memory_system}\n`;
  message += `- Has subagent orchestration: ${parsedSignals.has_subagent_orchestration}\n`;
  message += `- Has multi-machine setup: ${parsedSignals.has_multi_machine_setup}\n\n`;

  if (matchedSkills.length > 0) {
    message += `## Matched Skills from Database (${matchedSkills.length} skills)\n\n`;
    for (const skill of matchedSkills) {
      message += `- **${skill.name}** (${skill.category} → ${skill.primary_type}, complexity: ${skill.complexity}): ${skill.description}\n`;
    }
    message += `\n`;
  } else {
    message += `## Matched Skills\nNo skills matched the public database. The agent may use custom/proprietary skills.\n\n`;
  }

  message += `Generate the card profile JSON now. Remember: return ONLY valid JSON, no markdown code blocks.`;

  return message;
}

// ── Call Claude API ──────────────────────────────────────────────────

export async function generateCardProfile(
  rawText: string,
  matchedSkills: SkillEntry[],
  parsedSignals: {
    file_names: string[];
    has_security_rules: boolean;
    has_cron_tasks: boolean;
    has_memory_system: boolean;
    has_subagent_orchestration: boolean;
    has_multi_machine_setup: boolean;
    tool_count: number;
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

  const result = CardProfileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Card profile validation failed: ${JSON.stringify(result.error.issues, null, 2)}\n\nRaw JSON:\n${JSON.stringify(parsed, null, 2).slice(0, 500)}`
    );
  }

  return result.data;
}
