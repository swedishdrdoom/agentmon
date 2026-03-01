-- Agentmon: Create cards table
-- Run against your Neon database after setup:
--
--   psql $DATABASE_URL -f migrations/001_create_cards.sql
--
-- Or paste into the Neon dashboard SQL Editor.

CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  serial        INTEGER NOT NULL,
  name          TEXT NOT NULL,
  subtitle      TEXT,
  rarity        TEXT NOT NULL,
  primary_type  TEXT NOT NULL,
  secondary_type TEXT,
  hp            INTEGER NOT NULL,
  card_profile  JSONB NOT NULL,
  image_prompt  TEXT,
  image_url     TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_primary_type ON cards(primary_type);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);
