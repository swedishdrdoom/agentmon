import { describe, it, expect } from "vitest";
import {
  sanitizeBrandNames,
  enforceEnergyCost,
  parseDamageNumber,
  computeStatBudget,
  clampStats,
} from "../llm";
import type { CardProfile } from "../types";

// ── Test Fixtures ────────────────────────────────────────────────────

function makeProfile(overrides: Partial<CardProfile> = {}): CardProfile {
  return {
    name: "Sentinel",
    subtitle: "The Guardian Protocol",
    primary_type: "Steel",
    secondary_type: null,
    hp: 120,
    evolution_stage: "Stage 1",
    ability: { name: "Iron Vigil", description: "Prevents damage from Basic agents." },
    attacks: [
      { name: "Security Audit", energy_cost: "🛡️🛡️", damage: "80", description: "Scans for threats." },
    ],
    weakness: { type: "Fire", modifier: "×2" },
    resistance: { type: "Electric", modifier: "-30" },
    retreat_cost: 2,
    rarity: "Rare",
    stat_budget: 220,
    illustrator: "Unknown",
    flavor_text: "A sentinel stands watch.",
    image_prompt: "Iron golem in a forge.",
    layout_version: "1.3",
    ...overrides,
  };
}

// ── parseDamageNumber ────────────────────────────────────────────────

describe("parseDamageNumber", () => {
  it("parses plain numbers", () => {
    expect(parseDamageNumber("80")).toBe(80);
    expect(parseDamageNumber("120")).toBe(120);
  });

  it("parses numbers with + suffix", () => {
    expect(parseDamageNumber("100+")).toBe(100);
  });

  it("parses numbers with x suffix (takes leading digits only)", () => {
    // Note: "30x2" extracts 30, NOT 60. The code only takes the leading integer.
    expect(parseDamageNumber("30x2")).toBe(30);
  });

  it("returns 0 for empty string", () => {
    expect(parseDamageNumber("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseDamageNumber("abc")).toBe(0);
    expect(parseDamageNumber("+")).toBe(0);
  });
});

// ── computeStatBudget ────────────────────────────────────────────────

describe("computeStatBudget", () => {
  it("computes budget with single attack", () => {
    const profile = makeProfile({
      hp: 100,
      attacks: [{ name: "Slash", energy_cost: "🛡️", damage: "50", description: "A slash." }],
      retreat_cost: 2,
    });
    // 100 + 50 + (4-2)*10 = 170
    expect(computeStatBudget(profile)).toBe(170);
  });

  it("computes budget with two attacks", () => {
    const profile = makeProfile({
      hp: 120,
      attacks: [
        { name: "Slash", energy_cost: "🛡️", damage: "40", description: "Slash." },
        { name: "Slam", energy_cost: "🛡️🛡️", damage: "80", description: "Slam." },
      ],
      retreat_cost: 3,
    });
    // 120 + 40 + 80 + (4-3)*10 = 250
    expect(computeStatBudget(profile)).toBe(250);
  });

  it("handles retreat_cost=0 (adds 40)", () => {
    const profile = makeProfile({
      hp: 60,
      attacks: [{ name: "Tap", energy_cost: "🛡️", damage: "20", description: "Tap." }],
      retreat_cost: 0,
    });
    // 60 + 20 + (4-0)*10 = 120
    expect(computeStatBudget(profile)).toBe(120);
  });

  it("handles retreat_cost=4 (adds 0)", () => {
    const profile = makeProfile({
      hp: 160,
      attacks: [{ name: "Crush", energy_cost: "🛡️🛡️🛡️", damage: "120", description: "Crush." }],
      retreat_cost: 4,
    });
    // 160 + 120 + 0 = 280
    expect(computeStatBudget(profile)).toBe(280);
  });

  it("handles damage with + suffix", () => {
    const profile = makeProfile({
      hp: 100,
      attacks: [{ name: "Surge", energy_cost: "🛡️", damage: "80+", description: "Surge." }],
      retreat_cost: 2,
    });
    // 100 + 80 + 20 = 200
    expect(computeStatBudget(profile)).toBe(200);
  });
});

// ── clampStats ───────────────────────────────────────────────────────

describe("clampStats", () => {
  it("clamps HP below minimum for standard rarity", () => {
    const profile = makeProfile({ hp: 30, rarity: "Common" });
    const result = clampStats(profile);
    expect(result.hp).toBe(60);
  });

  it("clamps HP above maximum for standard rarity", () => {
    const profile = makeProfile({ hp: 200, rarity: "Rare" });
    const result = clampStats(profile);
    expect(result.hp).toBe(160);
  });

  it("allows wider range for Hyper Rare", () => {
    const profile = makeProfile({ hp: 50, rarity: "Hyper Rare" });
    const result = clampStats(profile);
    expect(result.hp).toBe(50); // 50 is valid for expanded

    const highProfile = makeProfile({ hp: 180, rarity: "Hyper Rare" });
    const highResult = clampStats(highProfile);
    expect(highResult.hp).toBe(180); // 180 is valid for expanded
  });

  it("allows wider range for Singularity", () => {
    const profile = makeProfile({ hp: 50, rarity: "Singularity" });
    expect(clampStats(profile).hp).toBe(50);

    const highProfile = makeProfile({ hp: 180, rarity: "Singularity" });
    expect(clampStats(highProfile).hp).toBe(180);
  });

  it("recomputes stat_budget after clamping", () => {
    const profile = makeProfile({
      hp: 200, // will be clamped to 160
      rarity: "Common",
      attacks: [{ name: "Hit", energy_cost: "🛡️", damage: "50", description: "Hit." }],
      retreat_cost: 2,
    });
    const result = clampStats(profile);
    // 160 + 50 + 20 = 230
    expect(result.stat_budget).toBe(230);
  });

  it("does not change HP already in range", () => {
    const profile = makeProfile({ hp: 100, rarity: "Rare" });
    const result = clampStats(profile);
    expect(result.hp).toBe(100);
  });
});

// ── sanitizeBrandNames ───────────────────────────────────────────────

describe("sanitizeBrandNames", () => {
  it("removes Pokemon references from name", () => {
    const profile = makeProfile({ name: "Pokemon Guardian" });
    const result = sanitizeBrandNames(profile);
    expect(result.name).not.toContain("Pokemon");
    expect(result.name).toBe("Guardian");
  });

  it("removes case-insensitive brand names", () => {
    const profile = makeProfile({ flavor_text: "Like a POKEMON battle" });
    const result = sanitizeBrandNames(profile);
    expect(result.flavor_text.toLowerCase()).not.toContain("pokemon");
  });

  it("removes multiple brand names", () => {
    const profile = makeProfile({ subtitle: "Yu-Gi-Oh meets Digimon" });
    const result = sanitizeBrandNames(profile);
    expect(result.subtitle).not.toContain("Yu-Gi-Oh");
    expect(result.subtitle).not.toContain("Digimon");
  });

  it("sanitizes ability names and descriptions", () => {
    const profile = makeProfile({
      ability: { name: "Pikachu Strike", description: "Channels Nintendo power." },
    });
    const result = sanitizeBrandNames(profile);
    expect(result.ability.name).not.toContain("Pikachu");
    expect(result.ability.description).not.toContain("Nintendo");
  });

  it("sanitizes attack names and descriptions", () => {
    const profile = makeProfile({
      attacks: [
        { name: "Charizard Blast", energy_cost: "🔥", damage: "100", description: "A Hearthstone move." },
      ],
    });
    const result = sanitizeBrandNames(profile);
    expect(result.attacks[0].name).not.toContain("Charizard");
    expect(result.attacks[0].description).not.toContain("Hearthstone");
  });

  it("preserves clean text untouched", () => {
    const profile = makeProfile({ name: "Sentinel", flavor_text: "A guardian watches." });
    const result = sanitizeBrandNames(profile);
    expect(result.name).toBe("Sentinel");
    expect(result.flavor_text).toBe("A guardian watches.");
  });

  it("cleans up double spaces after removal", () => {
    const profile = makeProfile({ name: "The Pokemon Guardian" });
    const result = sanitizeBrandNames(profile);
    // Should be "The Guardian" not "The  Guardian"
    expect(result.name).not.toContain("  ");
  });
});

// ── enforceEnergyCost ────────────────────────────────────────────────

describe("enforceEnergyCost", () => {
  it("keeps valid primary-type-only icons", () => {
    const profile = makeProfile({
      primary_type: "Steel",
      secondary_type: null,
      attacks: [{ name: "Slash", energy_cost: "🛡️🛡️", damage: "80", description: "Slash." }],
    });
    const result = enforceEnergyCost(profile);
    expect(result.attacks[0].energy_cost).toBe("🛡️🛡️");
  });

  it("replaces invalid type icons with primary type", () => {
    const profile = makeProfile({
      primary_type: "Steel",
      secondary_type: null,
      attacks: [{ name: "Splash", energy_cost: "🛡️🔥🌊", damage: "60", description: "Splash." }],
    });
    const result = enforceEnergyCost(profile);
    // Fire and Water icons should be replaced with Steel icon
    const icons = result.attacks[0].energy_cost;
    expect(icons).not.toContain("🔥");
    expect(icons).not.toContain("🌊");
  });

  it("allows secondary type icons when card has dual type", () => {
    const profile = makeProfile({
      primary_type: "Steel",
      secondary_type: "Fire",
      attacks: [{ name: "Forgefire", energy_cost: "🛡️🔥", damage: "90", description: "Burn." }],
    });
    const result = enforceEnergyCost(profile);
    expect(result.attacks[0].energy_cost).toContain("🛡️");
    expect(result.attacks[0].energy_cost).toContain("🔥");
  });

  it("caps energy icons at 3 per attack", () => {
    const profile = makeProfile({
      primary_type: "Fire",
      secondary_type: null,
      attacks: [{ name: "Blaze", energy_cost: "🔥🔥🔥🔥🔥", damage: "150", description: "Big fire." }],
    });
    const result = enforceEnergyCost(profile);
    // Count fire emojis — should be at most 3
    const fireCount = (result.attacks[0].energy_cost.match(/🔥/g) || []).length;
    expect(fireCount).toBeLessThanOrEqual(3);
  });

  it("defaults to 1 primary icon when no icons are parseable", () => {
    const profile = makeProfile({
      primary_type: "Steel",
      secondary_type: null,
      attacks: [{ name: "Mystery", energy_cost: "???", damage: "40", description: "Unknown." }],
    });
    const result = enforceEnergyCost(profile);
    expect(result.attacks[0].energy_cost).toBe("🛡️");
  });
});
