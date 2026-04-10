export interface Owner {
  id: number;
  name: string;
}

export interface Season {
  id: number;
  name: string;
  cricapi_series_id: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface League {
  id: string;
  name: string;
  slug: string;
  season_id: number | null;
  created_by: string | null;
  invite_code: string;
  max_owners: number;
  purse_budget: number;
  scoring_config: Record<string, unknown>;
  draft_status: string;
  created_at: string;
  season?: Season;
}

export interface LeagueMember {
  id: number;
  league_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  joined_at: string;
}

export interface Player {
  id: number;
  name: string;
  ipl_team: string | null;
  owner_id: number;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  cricapi_player_id: string | null;
  league_id: string | null;
  league_member_id: number | null;
}

export interface Match {
  id: number;
  cricapi_match_id: string;
  name: string;
  match_date: string;
  status: string;
  teams: string[];
  venue: string | null;
  result: string | null;
  synced_at: string;
  season_id: number | null;
}

export interface PlayerMatchScore {
  id: number;
  player_id: number;
  match_id: number;
  runs: number;
  wickets: number;
  catches: number;
  sixes: number;
  is_century: boolean;
  is_five_wicket: boolean;
  is_hat_trick: boolean;
  is_six_sixes: boolean;
  raw_points: number;
  final_points: number;
}

export interface OwnerStanding {
  member_id: number;
  name: string;
  league_id: string;
  user_id: string | null;
  total_points: number;
  rank: number;
}

export interface PlayerWithScore extends Player {
  total_points: number;
  matches_played: number;
}
