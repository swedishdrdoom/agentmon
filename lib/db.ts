/**
 * Database layer for persisting Agentmon cards.
 * Uses Neon serverless Postgres (the Vercel Postgres successor).
 *
 * Requires DATABASE_URL env var pointing to a Neon database.
 * Falls back gracefully when not configured (cards are ephemeral).
 */

import { neon } from "@neondatabase/serverless";
import type { FullCardProfile, Rarity, CardType } from "./types";

// ── Types ────────────────────────────────────────────────────────────

export interface CardRecord {
  id: string;
  serial: number;
  name: string;
  subtitle: string;
  rarity: Rarity;
  primary_type: CardType;
  secondary_type: CardType | null;
  hp: number;
  card_profile: FullCardProfile;
  image_prompt: string;
  image_url: string;
  created_at: string;
}

export interface CardListItem {
  id: string;
  name: string;
  subtitle: string;
  rarity: Rarity;
  primary_type: CardType;
  secondary_type: CardType | null;
  hp: number;
  image_url: string;
  serial: number;
  created_at: string;
}

export interface ListCardsOptions {
  limit?: number;
  offset?: number;
  rarity?: Rarity;
  type?: CardType;
}

// ── Client ───────────────────────────────────────────────────────────

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// ── Save ─────────────────────────────────────────────────────────────

export async function saveCard(
  id: string,
  profile: FullCardProfile,
  imagePrompt: string,
  imageUrl: string
): Promise<void> {
  const sql = getSQL();
  if (!sql) {
    console.warn("[db] DATABASE_URL not configured — card not persisted");
    return;
  }

  await sql`
    INSERT INTO cards (id, serial, name, subtitle, rarity, primary_type, secondary_type, hp, card_profile, image_prompt, image_url)
    VALUES (
      ${id},
      ${profile.serial_number},
      ${profile.name},
      ${profile.subtitle},
      ${profile.rarity},
      ${profile.primary_type},
      ${profile.secondary_type},
      ${profile.hp},
      ${JSON.stringify(profile)},
      ${imagePrompt},
      ${imageUrl}
    )
  `;
}

// ── Get ──────────────────────────────────────────────────────────────

export async function getCard(id: string): Promise<CardRecord | null> {
  const sql = getSQL();
  if (!sql) return null;

  const rows = await sql`
    SELECT id, serial, name, subtitle, rarity, primary_type, secondary_type, hp,
           card_profile, image_prompt, image_url, created_at
    FROM cards
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    serial: row.serial as number,
    name: row.name as string,
    subtitle: row.subtitle as string,
    rarity: row.rarity as Rarity,
    primary_type: row.primary_type as CardType,
    secondary_type: row.secondary_type as CardType | null,
    hp: row.hp as number,
    card_profile: row.card_profile as FullCardProfile,
    image_prompt: row.image_prompt as string,
    image_url: row.image_url as string,
    created_at: row.created_at as string,
  };
}

// ── List ─────────────────────────────────────────────────────────────

export async function listCards(
  options: ListCardsOptions = {}
): Promise<{ cards: CardListItem[]; total: number }> {
  const sql = getSQL();
  if (!sql) return { cards: [], total: 0 };

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;

  // Neon tagged templates don't support dynamic WHERE composition,
  // so we branch on the filter combination.
  let rows: Record<string, unknown>[];
  let countRows: Record<string, unknown>[];

  if (options.rarity && options.type) {
    rows = await sql`
      SELECT id, name, subtitle, rarity, primary_type, secondary_type, hp, image_url, serial, created_at
      FROM cards
      WHERE rarity = ${options.rarity} AND primary_type = ${options.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT COUNT(*) as count FROM cards
      WHERE rarity = ${options.rarity} AND primary_type = ${options.type}
    `;
  } else if (options.rarity) {
    rows = await sql`
      SELECT id, name, subtitle, rarity, primary_type, secondary_type, hp, image_url, serial, created_at
      FROM cards WHERE rarity = ${options.rarity}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT COUNT(*) as count FROM cards WHERE rarity = ${options.rarity}
    `;
  } else if (options.type) {
    rows = await sql`
      SELECT id, name, subtitle, rarity, primary_type, secondary_type, hp, image_url, serial, created_at
      FROM cards WHERE primary_type = ${options.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT COUNT(*) as count FROM cards WHERE primary_type = ${options.type}
    `;
  } else {
    rows = await sql`
      SELECT id, name, subtitle, rarity, primary_type, secondary_type, hp, image_url, serial, created_at
      FROM cards
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`SELECT COUNT(*) as count FROM cards`;
  }

  const total = Number(countRows[0].count);

  return {
    cards: rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      subtitle: row.subtitle as string,
      rarity: row.rarity as Rarity,
      primary_type: row.primary_type as CardType,
      secondary_type: row.secondary_type as CardType | null,
      hp: row.hp as number,
      image_url: row.image_url as string,
      serial: row.serial as number,
      created_at: row.created_at as string,
    })),
    total,
  };
}
