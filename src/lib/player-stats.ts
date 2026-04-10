import { supabase } from "./supabase";

export interface PlayerStat {
  id: number;
  name: string;
  ipl_team: string | null;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  owner_name: string;
  total_runs: number;
  total_wickets: number;
  total_points: number;
  matches_played: number;
  mvp_score: number; // 0–100 percentile (higher = better value per rupee)
}

export async function getAllPlayerStats(): Promise<PlayerStat[]> {
  const { data, error } = await supabase.from("players").select(`
      id, name, ipl_team, purse_spent, is_captain, is_vice_captain,
      owners!inner ( name ),
      player_match_scores ( runs, wickets, raw_points )
    `);

  if (error || !data) return [];

  const stats: PlayerStat[] = data.map((p) => {
    const scores = (
      p.player_match_scores as { runs: number; wickets: number; raw_points: number }[]
    ) ?? [];
    return {
      id: p.id,
      name: p.name,
      ipl_team: p.ipl_team,
      purse_spent: p.purse_spent,
      is_captain: p.is_captain,
      is_vice_captain: p.is_vice_captain,
      owner_name: (p.owners as unknown as { name: string }).name,
      total_runs: scores.reduce((s, ms) => s + ms.runs, 0),
      total_wickets: scores.reduce((s, ms) => s + ms.wickets, 0),
      total_points: scores.reduce((s, ms) => s + ms.raw_points, 0),
      matches_played: scores.length,
      mvp_score: 0,
    };
  });

  // Compute MVP percentile: ratio = total_points / purse_spent, ranked lowest→highest
  const n = stats.length;
  if (n > 1) {
    const sorted = [...stats].sort((a, b) => {
      const ra = a.purse_spent > 0 ? a.total_points / a.purse_spent : 0;
      const rb = b.purse_spent > 0 ? b.total_points / b.purse_spent : 0;
      return ra - rb;
    });
    sorted.forEach((p, idx) => {
      const pct = Math.round((idx / (n - 1)) * 100);
      stats.find((s) => s.id === p.id)!.mvp_score = pct;
    });
  } else if (n === 1) {
    stats[0].mvp_score = 100;
  }

  return stats;
}
