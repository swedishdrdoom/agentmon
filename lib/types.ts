import { z } from "zod";

// ── Card Element Types ───────────────────────────────────────────────

export const CARD_TYPES = [
  "Electric",
  "Psychic",
  "Normal",
  "Ground",
  "Steel",
  "Dragon",
  "Water",
  "Fire",
  "Grass",
  "Ice",
  "Ghost",
  "Fairy",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const TYPE_METADATA: Record<
  CardType,
  { icon: string; color: string; hex: string }
> = {
  Electric: { icon: "⚡", color: "Yellow", hex: "#FFD700" },
  Psychic: { icon: "🔮", color: "Purple", hex: "#9B59B6" },
  Normal: { icon: "📚", color: "Gray", hex: "#95A5A6" },
  Ground: { icon: "🔍", color: "Brown", hex: "#8B4513" },
  Steel: { icon: "🛡️", color: "Silver", hex: "#C0C0C0" },
  Dragon: { icon: "🐉", color: "Indigo", hex: "#4B0082" },
  Water: { icon: "🌊", color: "Blue", hex: "#3498DB" },
  Fire: { icon: "🔥", color: "Red", hex: "#E74C3C" },
  Grass: { icon: "🌿", color: "Green", hex: "#27AE60" },
  Ice: { icon: "🧊", color: "Cyan", hex: "#00BCD4" },
  Ghost: { icon: "👻", color: "Dark purple", hex: "#2C003E" },
  Fairy: { icon: "✨", color: "Pink", hex: "#FF69B4" },
};

// ── Rarity ───────────────────────────────────────────────────────────

export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Hyper Rare",
  "Singularity",
] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_SYMBOLS: Record<Rarity, string> = {
  Common: "●",
  Uncommon: "◆",
  Rare: "★",
  Epic: "★★",
  Legendary: "★★★",
  "Hyper Rare": "✦",
  Singularity: "◉",
};

// ── Skills Database ──────────────────────────────────────────────────

export const SkillEntrySchema = z.object({
  slug: z.string(),
  name: z.string(),
  author: z.string(),
  description: z.string(),
  category: z.string(),
  primary_type: z.enum(CARD_TYPES),
  complexity: z.enum(["low", "medium", "high"]),
});

export type SkillEntry = z.infer<typeof SkillEntrySchema>;

// ── Content Depth ────────────────────────────────────────────────────

export const CONTENT_DEPTHS = ["minimal", "moderate", "rich"] as const;
export type ContentDepth = (typeof CONTENT_DEPTHS)[number];

// ── Parser Output ────────────────────────────────────────────────────

export const ParsedInputSchema = z.object({
  agent_name: z.string().nullable(),
  raw_text: z.string(),
  file_names: z.array(z.string()),
  skill_slugs: z.array(z.string()),
  has_security_rules: z.boolean(),
  has_cron_tasks: z.boolean(),
  has_memory_system: z.boolean(),
  has_subagent_orchestration: z.boolean(),
  has_multi_machine_setup: z.boolean(),
  tool_count: z.number(),
  content_depth: z.enum(CONTENT_DEPTHS),
  total_content_length: z.number(),
  file_count: z.number(),
});

export type ParsedInput = z.infer<typeof ParsedInputSchema>;

// ── Card Profile (LLM Output) ───────────────────────────────────────

export const AttackSchema = z.object({
  name: z.string(),
  energy_cost: z.string(),
  damage: z.string(),
  description: z.string(),
});

export const CardProfileSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  primary_type: z.enum(CARD_TYPES),
  secondary_type: z.enum(CARD_TYPES).nullable(),
  hp: z.number().min(50).max(180),
  evolution_stage: z.enum(["Basic", "Stage 1", "Stage 2"]),

  ability: z.object({
    name: z.string(),
    description: z.string(),
  }),

  attacks: z.array(AttackSchema).min(1).max(2),

  weakness: z.object({
    type: z.enum(CARD_TYPES),
    modifier: z.literal("×2"),
  }),
  resistance: z.object({
    type: z.enum(CARD_TYPES),
    modifier: z.literal("-30"),
  }),
  retreat_cost: z.number().min(0).max(4),

  rarity: z.enum(RARITIES),
  stat_budget: z.number().min(0).max(500),
  illustrator: z.string(),

  flavor_text: z.string(),
  image_prompt: z.string(),
  layout_version: z.literal("1.3"),
});

/** Card profile as returned by the LLM (no serial number yet). */
export type CardProfile = z.infer<typeof CardProfileSchema>;

// ── Card Profile with Serial Number ─────────────────────────────

/** Extends the LLM card profile with a globally unique serial number from KV. */
export const FullCardProfileSchema = CardProfileSchema.extend({
  serial_number: z.number().int().min(1),
});

export type FullCardProfile = z.infer<typeof FullCardProfileSchema>;

// ── API Response ─────────────────────────────────────────────────

export const GenerateResponseSchema = z.object({
  card_image: z.string(), // base64 PNG
  card_profile: FullCardProfileSchema,
  image_prompt: z.string(),
  layout_version: z.string(),
});

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

// ── Category → Type Mapping ──────────────────────────────────────────

export const CATEGORY_TYPE_MAP: Record<string, CardType> = {
  "Web & Frontend Development": "Electric",
  "Coding Agents & IDEs": "Electric",
  "Git & GitHub": "Electric",
  Moltbook: "Dragon",
  "DevOps & Cloud": "Steel",
  "Browser & Automation": "Electric",
  "Image & Video Generation": "Psychic",
  "Apple Apps & Services": "Normal",
  "Search & Research": "Ground",
  "Clawdbot Tools": "Normal",
  "CLI Utilities": "Electric",
  "Marketing & Sales": "Fire",
  "Productivity & Tasks": "Normal",
  "AI & LLMs": "Dragon",
  "Data & Analytics": "Water",
  Finance: "Water",
  "Media & Streaming": "Psychic",
  "Notes & PKM": "Normal",
  "iOS & macOS Development": "Electric",
  Transportation: "Fire",
  "Personal Development": "Fairy",
  "Health & Fitness": "Grass",
  Communication: "Normal",
  "Speech & Transcription": "Psychic",
  "Smart Home & IoT": "Ghost",
  "Shopping & E-commerce": "Fire",
  "Calendar & Scheduling": "Ice",
  "PDF & Documents": "Normal",
  "Self-Hosted & Automation": "Steel",
  "Security & Passwords": "Steel",
  Gaming: "Fire",
  "Agent-to-Agent Protocols": "Dragon",
};
