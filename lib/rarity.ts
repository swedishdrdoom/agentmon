/**
 * Server-side rarity roll using crypto-secure randomness.
 * Rarity is pure RNG — completely decoupled from agent content.
 *
 * Distribution (single card draw):
 *   Common:      69.0499%  (~7 in 10)
 *   Uncommon:    22.00%    (~1 in 5)
 *   Rare:         7.00%    (~1 in 14)
 *   Epic:         1.50%    (~1 in 67)
 *   Legendary:    0.40%    (~1 in 250)
 *   Hyper Rare:   0.05%    (~1 in 2,000)
 *   Singularity:  0.0001%  (~1 in 1,000,000)
 */

import { type Rarity } from "./types";

const RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: "Common",      weight: 0.690499 },
  { rarity: "Uncommon",    weight: 0.2200 },
  { rarity: "Rare",        weight: 0.0700 },
  { rarity: "Epic",        weight: 0.0150 },
  { rarity: "Legendary",   weight: 0.0040 },
  { rarity: "Hyper Rare",  weight: 0.0005 },
  { rarity: "Singularity", weight: 0.000001 },
];

/**
 * Roll a rarity tier using crypto-secure randomness.
 * Uses the Web Crypto API (available in Node 19+ and all modern runtimes).
 */
export function rollRarity(): Rarity {
  // Generate a cryptographically secure random float in [0, 1)
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const roll = array[0] / (0xffffffff + 1);

  let cumulative = 0;
  for (const { rarity, weight } of RARITY_TABLE) {
    cumulative += weight;
    if (roll < cumulative) {
      return rarity;
    }
  }

  // Fallback (should never reach here due to floating point)
  return "Common";
}

/**
 * Returns true if this rarity tier gets expanded stat variance (±30% instead of ±15%).
 */
export function hasExpandedVariance(rarity: Rarity): boolean {
  return rarity === "Hyper Rare" || rarity === "Singularity";
}
