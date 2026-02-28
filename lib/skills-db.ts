import type { SkillEntry } from "./types";
import skillsData from "./data/skills-db.json";

interface SkillsDB {
  version: string;
  generated_at: string;
  source: string;
  total_skills: number;
  skills: SkillEntry[];
}

const db = skillsData as SkillsDB;

// Pre-build a lookup map keyed by slug (lowercase)
const slugMap = new Map<string, SkillEntry>();
for (const skill of db.skills) {
  slugMap.set(skill.slug.toLowerCase(), skill);
}

/**
 * Look up a single skill by slug (case-insensitive).
 */
export function lookupSkill(slug: string): SkillEntry | undefined {
  return slugMap.get(slug.toLowerCase());
}

/**
 * Look up multiple skills by slug. Returns only matches.
 */
export function lookupSkills(slugs: string[]): SkillEntry[] {
  const results: SkillEntry[] = [];
  for (const slug of slugs) {
    const entry = lookupSkill(slug);
    if (entry) results.push(entry);
  }
  return results;
}

/**
 * Search skills by partial name/description match.
 * Useful for fuzzy matching skill references in agent files.
 */
export function searchSkills(query: string, limit = 10): SkillEntry[] {
  const lower = query.toLowerCase();
  const results: SkillEntry[] = [];

  for (const skill of db.skills) {
    if (
      skill.slug.toLowerCase().includes(lower) ||
      skill.description.toLowerCase().includes(lower)
    ) {
      results.push(skill);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get all skills in the database.
 */
export function getAllSkills(): SkillEntry[] {
  return db.skills;
}

/**
 * Get database metadata.
 */
export function getDBMeta() {
  return {
    version: db.version,
    generated_at: db.generated_at,
    source: db.source,
    total_skills: db.total_skills,
  };
}
