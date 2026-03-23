import { supabase } from "./supabase";
import type { OwnerStanding, Player, PlayerMatchScore, Match } from "./types";

export async function getLeaderboard(): Promise<OwnerStanding[]> {
  const { data, error } = await supabase
    .from("owner_standings")
    .select("*")
    .order("rank", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOwnerPlayers(
  ownerName: string
): Promise<(Player & { total_points: number; matches_played: number })[]> {
  // First get the owner
  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("name", ownerName)
    .single();

  if (ownerError || !owner) return [];

  // Get players with aggregated scores
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(
      `
      *,
      player_match_scores (
        final_points
      )
    `
    )
    .eq("owner_id", owner.id);

  if (playersError) throw playersError;

  return (players ?? []).map((p) => ({
    ...p,
    total_points: (p.player_match_scores as { final_points: number }[]).reduce(
      (sum: number, s: { final_points: number }) => sum + s.final_points,
      0
    ),
    matches_played: (p.player_match_scores as { final_points: number }[])
      .length,
  }));
}

export async function getRecentMatches(
  limit = 20
): Promise<
  (Match & { player_scores: (PlayerMatchScore & { player: Player })[] })[]
> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      player_match_scores (
        *,
        player:players (*)
      )
    `
    )
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    player_scores: m.player_match_scores ?? [],
  }));
}
