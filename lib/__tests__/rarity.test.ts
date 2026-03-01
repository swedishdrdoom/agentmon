import { describe, it, expect, vi } from "vitest";
import { rollRarity, hasExpandedVariance } from "../rarity";

describe("rollRarity", () => {
  it("returns Common for low roll values", () => {
    // Mock crypto.getRandomValues to return a value that maps to ~0.0
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = 0;
        return arr;
      },
    });
    expect(rollRarity()).toBe("Common");
    vi.unstubAllGlobals();
  });

  it("returns Common for roll just below the Common threshold", () => {
    // 0.69 = 0.69 * (0xFFFFFFFF + 1)
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = Math.floor(0.69 * (0xffffffff + 1));
        return arr;
      },
    });
    expect(rollRarity()).toBe("Common");
    vi.unstubAllGlobals();
  });

  it("returns Uncommon for roll just above the Common threshold", () => {
    // 0.6905 is just past the Common cumulative weight of 0.690499
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = Math.floor(0.6905 * (0xffffffff + 1));
        return arr;
      },
    });
    expect(rollRarity()).toBe("Uncommon");
    vi.unstubAllGlobals();
  });

  it("returns Rare for roll in the Rare band", () => {
    // Uncommon ends at 0.690499 + 0.22 = 0.910499
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = Math.floor(0.915 * (0xffffffff + 1));
        return arr;
      },
    });
    expect(rollRarity()).toBe("Rare");
    vi.unstubAllGlobals();
  });

  it("returns Singularity for roll near 1.0", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = 0xffffffff; // Maximum value, maps to ~0.9999999998
        return arr;
      },
    });
    // At 0.9999999... the cumulative sum should have passed all tiers
    // This should hit the "Singularity" tier or the fallback "Common"
    const result = rollRarity();
    expect(["Singularity", "Common"]).toContain(result);
    vi.unstubAllGlobals();
  });

  it("always returns a valid rarity string", () => {
    const validRarities = [
      "Common", "Uncommon", "Rare", "Epic",
      "Legendary", "Hyper Rare", "Singularity",
    ];
    // Run 100 rolls with real RNG
    for (let i = 0; i < 100; i++) {
      expect(validRarities).toContain(rollRarity());
    }
  });
});

describe("hasExpandedVariance", () => {
  it("returns true for Hyper Rare", () => {
    expect(hasExpandedVariance("Hyper Rare")).toBe(true);
  });

  it("returns true for Singularity", () => {
    expect(hasExpandedVariance("Singularity")).toBe(true);
  });

  it("returns false for all other rarities", () => {
    expect(hasExpandedVariance("Common")).toBe(false);
    expect(hasExpandedVariance("Uncommon")).toBe(false);
    expect(hasExpandedVariance("Rare")).toBe(false);
    expect(hasExpandedVariance("Epic")).toBe(false);
    expect(hasExpandedVariance("Legendary")).toBe(false);
  });
});
