export interface Owner {
  id: number;
  name: string;
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
  owner_id: number;
  name: string;
  total_points: number;
  rank: number;
}

export interface PlayerWithScore extends Player {
  total_points: number;
  matches_played: number;
}
