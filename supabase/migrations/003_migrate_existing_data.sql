-- Migration 003: Migrate existing data into multi-league structure
-- Run AFTER 002_multi_league.sql
-- This creates a default season, league, and league members for the existing 7 owners

-- 1. Create the IPL 2026 season
INSERT INTO seasons (name, cricapi_series_id, start_date, end_date, is_active)
VALUES ('IPL 2026', NULL, '2026-03-22', '2026-05-25', true)
ON CONFLICT DO NOTHING;

-- 2. Create a default league for existing owners
-- Note: created_by is NULL since these owners may not have user accounts yet
INSERT INTO leagues (id, name, slug, season_id, created_by, max_owners, purse_budget)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'The Original League',
  'the-original-league',
  (SELECT id FROM seasons WHERE name = 'IPL 2026' LIMIT 1),
  NULL,
  7,
  20000
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Create league_members for each existing owner
-- (user_id is NULL until owners create accounts and are linked)
INSERT INTO league_members (league_id, user_id, display_name, role)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  o.name,
  'member'
FROM owners o
ON CONFLICT DO NOTHING;

-- 4. Backfill players with league_id and league_member_id
UPDATE players p
SET
  league_id = 'a0000000-0000-0000-0000-000000000001',
  league_member_id = lm.id
FROM owners o
JOIN league_members lm ON lm.display_name = o.name
  AND lm.league_id = 'a0000000-0000-0000-0000-000000000001'
WHERE p.owner_id = o.id
  AND p.league_id IS NULL;

-- 5. Backfill matches with season_id
UPDATE matches
SET season_id = (SELECT id FROM seasons WHERE name = 'IPL 2026' LIMIT 1)
WHERE season_id IS NULL;
