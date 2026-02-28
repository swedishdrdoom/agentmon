/**
 * Skills Database Builder
 *
 * Fetches the awesome-openclaw-skills README from GitHub,
 * parses each category and its skill list items,
 * maps categories to Pokemon-style types,
 * assigns complexity heuristics,
 * and outputs lib/data/skills-db.json.
 *
 * Usage: npx tsx scripts/build-skills-db.ts
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

// ── Category → Type Mapping (from spec) ──────────────────────────────

const CATEGORY_TYPE_MAP: Record<string, string> = {
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

// ── Complexity Heuristic ─────────────────────────────────────────────

const HIGH_COMPLEXITY_KEYWORDS = [
  "orchestrat",
  "multi-agent",
  "swarm",
  "autonomous",
  "pipeline",
  "distributed",
  "real-time",
  "infrastructure",
  "framework",
  "engine",
  "platform",
  "protocol",
  "blockchain",
  "security",
  "encrypt",
];

const MEDIUM_COMPLEXITY_KEYWORDS = [
  "automat",
  "integrat",
  "monitor",
  "deploy",
  "manage",
  "workflow",
  "analyz",
  "generat",
  "transform",
  "sync",
  "schedule",
  "audit",
  "scan",
];

function assignComplexity(description: string): "low" | "medium" | "high" {
  const lower = description.toLowerCase();
  if (HIGH_COMPLEXITY_KEYWORDS.some((kw) => lower.includes(kw))) return "high";
  if (MEDIUM_COMPLEXITY_KEYWORDS.some((kw) => lower.includes(kw)))
    return "medium";
  return "low";
}

// ── Parser ───────────────────────────────────────────────────────────

interface SkillEntry {
  slug: string;
  name: string;
  author: string;
  description: string;
  category: string;
  primary_type: string;
  complexity: "low" | "medium" | "high";
}

function extractAuthorFromUrl(url: string): string {
  // URL format: .../skills/{author}/{slug}/SKILL.md
  const match = url.match(/skills\/([^/]+)\/([^/]+)/);
  return match ? match[1] : "unknown";
}

function parseReadme(markdown: string): SkillEntry[] {
  const skills: SkillEntry[] = [];
  const lines = markdown.split("\n");

  let currentCategory: string | null = null;

  for (const line of lines) {
    // Match category headings like:
    // <summary><h3 style="display:inline">Coding Agents & IDEs</h3></summary>
    // or ### Category Name
    const categoryMatch =
      line.match(/<h3[^>]*>([^<]+)<\/h3>/) ||
      line.match(/^###\s+(.+)$/);

    if (categoryMatch) {
      const rawCategory = categoryMatch[1].trim();
      // Clean up any trailing content like "(133)"
      currentCategory = rawCategory.replace(/\s*\(\d+\)\s*$/, "").trim();
      continue;
    }

    // Match skill list items like:
    // - [slug](url) - Description text
    // - [slug](url) - Description text
    const skillMatch = line.match(
      /^-\s+\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/
    );

    if (skillMatch && currentCategory) {
      const [, name, url, description] = skillMatch;
      const slug = name.trim();
      const author = extractAuthorFromUrl(url);
      const primaryType = CATEGORY_TYPE_MAP[currentCategory] || "Normal";

      skills.push({
        slug,
        name: slug,
        author,
        description: description.trim(),
        category: currentCategory,
        primary_type: primaryType,
        complexity: assignComplexity(description),
      });
    }
  }

  return skills;
}

// ── Deduplication ────────────────────────────────────────────────────

function deduplicateSkills(skills: SkillEntry[]): SkillEntry[] {
  const seen = new Map<string, SkillEntry>();
  for (const skill of skills) {
    // Keep the first occurrence of each slug
    if (!seen.has(skill.slug)) {
      seen.set(skill.slug, skill);
    }
  }
  return Array.from(seen.values());
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const README_URL =
    "https://raw.githubusercontent.com/VoltAgent/awesome-openclaw-skills/main/README.md";

  console.log("Fetching README from GitHub...");
  const response = await fetch(README_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch README: ${response.status} ${response.statusText}`);
  }

  const markdown = await response.text();
  console.log(`Fetched ${(markdown.length / 1024).toFixed(0)}KB of markdown`);

  console.log("Parsing skills...");
  const rawSkills = parseReadme(markdown);
  console.log(`Parsed ${rawSkills.length} raw skill entries`);

  const skills = deduplicateSkills(rawSkills);
  console.log(`After dedup: ${skills.length} unique skills`);

  // Stats
  const categoryCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const complexityCounts: Record<string, number> = {};

  for (const skill of skills) {
    categoryCounts[skill.category] =
      (categoryCounts[skill.category] || 0) + 1;
    typeCounts[skill.primary_type] =
      (typeCounts[skill.primary_type] || 0) + 1;
    complexityCounts[skill.complexity] =
      (complexityCounts[skill.complexity] || 0) + 1;
  }

  console.log("\n── Categories ──");
  for (const [cat, count] of Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log("\n── Types ──");
  for (const [type, count] of Object.entries(typeCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\n── Complexity ──");
  for (const [complexity, count] of Object.entries(complexityCounts)) {
    console.log(`  ${complexity}: ${count}`);
  }

  // Write output
  const outputPath = resolve(__dirname, "../lib/data/skills-db.json");
  const output = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    source: "https://github.com/VoltAgent/awesome-openclaw-skills",
    total_skills: skills.length,
    skills,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  const fileSizeKB = (
    Buffer.byteLength(JSON.stringify(output, null, 2)) / 1024
  ).toFixed(0);
  console.log(`\nWrote ${outputPath} (${fileSizeKB}KB, ${skills.length} skills)`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
