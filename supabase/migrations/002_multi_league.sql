-- Migration 002: Multi-league & multi-season support
-- Adds seasons, leagues, league_members tables and evolves players/matches

-- ============================================================
-- New tables
-- ============================================================

CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cricapi_series_id TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  season_id INTEGER REFERENCES seasons(id),
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  max_owners INTEGER DEFAULT 10,
  purse_budget INTEGER DEFAULT 20000,
  scoring_config JSONB DEFAULT '{}',
  draft_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_members (
  id SERIAL PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- ============================================================
-- Evolve existing tables
-- ============================================================

-- Players: add league context
ALTER TABLE players ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS league_member_id INTEGER REFERENCES league_members(id);

-- Matches: add season context
ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id);

-- ============================================================
-- Replace owner_standings view (now league-scoped)
-- ============================================================

DROP VIEW IF EXISTS owner_standings;

CREATE VIEW owner_standings AS
SELECT
  lm.id AS member_id,
  lm.display_name AS name,
  lm.league_id,
  lm.user_id,
  COALESCE(SUM(pms.final_points), 0)::INTEGER AS total_points,
  RANK() OVER (
    PARTITION BY lm.league_id
    ORDER BY COALESCE(SUM(pms.final_points), 0) DESC
  )::INTEGER AS rank
FROM league_members lm
LEFT JOIN players p ON p.league_member_id = lm.id
LEFT JOIN player_match_scores pms ON pms.player_id = p.id
GROUP BY lm.id, lm.display_name, lm.league_id, lm.user_id;

-- ============================================================
-- RLS policies
-- ============================================================

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Seasons: readable by everyone
CREATE POLICY "Seasons are viewable by everyone" ON seasons
  FOR SELECT USING (true);

-- Leagues: readable by everyone, writable by authenticated users
CREATE POLICY "Leagues are viewable by everyone" ON leagues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create leagues" ON leagues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "League creator can update" ON leagues
  FOR UPDATE USING (auth.uid() = created_by);

-- League members: readable by everyone, join/leave by authenticated users
CREATE POLICY "League members are viewable by everyone" ON league_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join leagues" ON league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave leagues" ON league_members
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_players_league_id ON players(league_id);
CREATE INDEX IF NOT EXISTS idx_players_league_member_id ON players(league_member_id);
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_leagues_slug ON leagues(slug);
CREATE INDEX IF NOT EXISTS idx_leagues_season_id ON leagues(season_id);
