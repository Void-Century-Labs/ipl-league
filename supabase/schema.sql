-- owners table
CREATE TABLE owners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ipl_team TEXT,
  owner_id INTEGER REFERENCES owners(id),
  purse_spent INTEGER DEFAULT 0,
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  cricapi_player_id TEXT
);

-- matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  cricapi_match_id TEXT UNIQUE,
  name TEXT,
  match_date TIMESTAMPTZ,
  status TEXT, -- 'upcoming', 'live', 'completed'
  teams TEXT[], -- array of team names
  venue TEXT,
  result TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- player_match_scores table
CREATE TABLE player_match_scores (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  match_id INTEGER REFERENCES matches(id),
  runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  catches INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  is_century BOOLEAN DEFAULT FALSE,
  is_five_wicket BOOLEAN DEFAULT FALSE,
  is_hat_trick BOOLEAN DEFAULT FALSE,
  is_six_sixes BOOLEAN DEFAULT FALSE,
  raw_points INTEGER DEFAULT 0,
  final_points INTEGER DEFAULT 0,
  UNIQUE(player_id, match_id)
);

-- View for leaderboard
CREATE VIEW owner_standings AS
SELECT
  o.id AS owner_id,
  o.name,
  COALESCE(SUM(pms.final_points), 0)::INTEGER AS total_points,
  RANK() OVER (ORDER BY COALESCE(SUM(pms.final_points), 0) DESC)::INTEGER AS rank
FROM owners o
LEFT JOIN players p ON p.owner_id = o.id
LEFT JOIN player_match_scores pms ON pms.player_id = p.id
GROUP BY o.id, o.name;
