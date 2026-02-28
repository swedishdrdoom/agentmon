/**
 * Sequential serial number generation for Agentmon cards.
 * Uses Upstash Redis (via Vercel KV integration) for atomic INCR.
 * Falls back to timestamp-based numbers in local dev when KV is not configured.
 */

import { Redis } from "@upstash/redis";

const SERIAL_KEY = "agentmon:card:serial";

/**
 * Returns a configured Redis client, or null if KV env vars are missing.
 * Supports multiple naming conventions from Vercel marketplace integrations:
 *   - KV_REST_API_URL / KV_REST_API_TOKEN (legacy Vercel KV)
 *   - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (direct Upstash)
 *   - agentmon_KV_REST_API_URL / agentmon_KV_REST_API_TOKEN (Vercel Upstash integration with db-name prefix)
 */
function getRedisClient(): Redis | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.agentmon_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.agentmon_KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

/**
 * Get the next sequential serial number for a new card.
 * - In production (with Redis): atomic INCR starting from 1.
 * - In local dev (no Redis): timestamp-based pseudo-unique number.
 */
export async function getNextSerialNumber(): Promise<number> {
  const redis = getRedisClient();

  if (redis) {
    // Atomic increment — first call returns 1, then 2, 3, etc.
    const serial = await redis.incr(SERIAL_KEY);
    return serial;
  }

  // Fallback for local development without KV configured.
  // Uses last 5 digits of timestamp to produce a dev-recognizable number.
  console.warn(
    "[serial] No KV/Redis env vars found — using timestamp fallback for serial number"
  );
  return Date.now() % 100000;
}
