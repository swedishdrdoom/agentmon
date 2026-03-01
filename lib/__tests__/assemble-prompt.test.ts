import { describe, it, expect } from "vitest";
import { assemblePrompt, buildRetreatDots } from "../assemble-prompt";
import type { FullCardProfile } from "../types";

// ── buildRetreatDots ─────────────────────────────────────────────────

describe("buildRetreatDots", () => {
  it("returns free retreat for 0", () => {
    expect(buildRetreatDots(0)).toBe("none (free retreat)");
  });

  it("returns correct dots for 1-4", () => {
    expect(buildRetreatDots(1)).toBe("⚪");
    expect(buildRetreatDots(2)).toBe("⚪ ⚪");
    expect(buildRetreatDots(3)).toBe("⚪ ⚪ ⚪");
    expect(buildRetreatDots(4)).toBe("⚪ ⚪ ⚪ ⚪");
  });
});

// ── assemblePrompt ───────────────────────────────────────────────────

function makeFullProfile(overrides: Partial<FullCardProfile> = {}): FullCardProfile {
  return {
    name: "Sentinel",
    subtitle: "The Guardian Protocol",
    primary_type: "Steel",
    secondary_type: null,
    hp: 140,
    evolution_stage: "Stage 1",
    ability: { name: "Iron Vigil", description: "Prevents damage from Basic agents." },
    attacks: [
      { name: "Security Audit", energy_cost: "🛡️🛡️", damage: "90", description: "Scans for threats." },
    ],
    weakness: { type: "Fire", modifier: "×2" },
    resistance: { type: "Electric", modifier: "-30" },
    retreat_cost: 2,
    rarity: "Rare",
    stat_budget: 250,
    illustrator: "Dr Doom",
    flavor_text: "A sentinel stands watch.",
    image_prompt: "Iron golem in a forge cathedral.",
    layout_version: "1.3",
    serial_number: 42,
    ...overrides,
  };
}

describe("assemblePrompt", () => {
  it("includes the card name", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("Sentinel");
  });

  it("includes HP value", () => {
    const result = assemblePrompt(makeFullProfile({ hp: 140 }));
    expect(result).toContain("140");
  });

  it("includes the image prompt", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("Iron golem in a forge cathedral.");
  });

  it("includes ability name and description", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("Iron Vigil");
    expect(result).toContain("Prevents damage from Basic agents.");
  });

  it("includes attack details", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("Security Audit");
    expect(result).toContain("90");
  });

  it("includes serial number", () => {
    const result = assemblePrompt(makeFullProfile({ serial_number: 42 }));
    expect(result).toContain("42");
  });

  it("includes flavor text", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("A sentinel stands watch.");
  });

  it("includes rarity-specific treatment for Rare", () => {
    const result = assemblePrompt(makeFullProfile({ rarity: "Rare" }));
    expect(result).toContain("RARITY TREATMENT");
    expect(result).toContain("RARE");
    expect(result).toContain("Gold metallic border");
  });

  it("includes rarity-specific treatment for Singularity", () => {
    const result = assemblePrompt(makeFullProfile({ rarity: "Singularity" }));
    expect(result).toContain("SINGULARITY");
    expect(result).toContain("INVERTED");
  });

  it("includes rarity-specific treatment for Common", () => {
    const result = assemblePrompt(makeFullProfile({ rarity: "Common" }));
    expect(result).toContain("COMMON");
    expect(result).toContain("No foil, no shimmer, no glow");
  });

  it("does not include other rarity treatments", () => {
    const result = assemblePrompt(makeFullProfile({ rarity: "Common" }));
    // Common should NOT contain Legendary or Hyper Rare treatments
    expect(result).not.toContain("LEGENDARY");
    expect(result).not.toContain("HYPER RARE");
    expect(result).not.toContain("SINGULARITY");
  });

  it("handles dual-type cards with secondary type icon", () => {
    const result = assemblePrompt(makeFullProfile({ secondary_type: "Fire" }));
    expect(result).toContain("🔥");
    expect(result).toContain("Fire");
  });

  it("handles single-type cards with no secondary type suffix", () => {
    const result = assemblePrompt(makeFullProfile({ secondary_type: null }));
    // Should not have a dangling "and" for secondary type
    expect(result).not.toContain("and  icon");
  });

  it("always includes PORTRAIT orientation constraint", () => {
    const result = assemblePrompt(makeFullProfile());
    expect(result).toContain("PORTRAIT");
  });
});
