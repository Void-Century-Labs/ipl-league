import { supabase } from "./supabase";
import type { OwnerStanding, Player, PlayerMatchScore, Match } from "./types";

export async function getLeaderboard(leagueId: string): Promise<OwnerStanding[]> {
  const { data, error } = await supabase
    .from("owner_standings")
    .select("*")
    .eq("league_id", leagueId)
    .order("rank", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOwnerPlayers(
  leagueId: string,
  memberName: string
): Promise<(Player & { total_points: number; matches_played: number })[]> {
  // Find the league member
  const { data: member, error: memberError } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("display_name", memberName)
    .single();

  if (memberError || !member) return [];

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
    .eq("league_member_id", member.id);

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
  seasonId: number,
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
    .eq("season_id", seasonId)
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    player_scores: m.player_match_scores ?? [],
  }));
}

// Get all leagues a user is a member of
export async function getUserLeagues(userId: string) {
  const { data, error } = await supabase
    .from("league_members")
    .select("league_id, display_name, role, leagues(id, name, slug, seasons(name))")
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

// Get a league by slug
export async function getLeagueBySlug(slug: string) {
  const { data, error } = await supabase
    .from("leagues")
    .select("*, seasons(*)")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

// Get user's players across all leagues (for home page)
export async function getUserTopPlayers(userId: string) {
  // Get all league_member IDs for this user
  const { data: memberships, error: memError } = await supabase
    .from("league_members")
    .select("id, league_id, display_name, leagues(name, slug)")
    .eq("user_id", userId);

  if (memError || !memberships?.length) return [];

  const memberIds = memberships.map((m) => m.id);

  // Get all players for these memberships with scores
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(
      `
      id, name, ipl_team, purse_spent, is_captain, is_vice_captain, league_member_id,
      player_match_scores (final_points)
    `
    )
    .in("league_member_id", memberIds);

  if (playersError || !players) return [];

  return players
    .map((p) => {
      const scores = (p.player_match_scores as { final_points: number }[]) ?? [];
      const membership = memberships.find((m) => m.id === p.league_member_id);
      return {
        id: p.id,
        name: p.name,
        ipl_team: p.ipl_team,
        purse_spent: p.purse_spent,
        is_captain: p.is_captain,
        is_vice_captain: p.is_vice_captain,
        league_name: (membership?.leagues as unknown as { name: string } | null)?.name ?? "Unknown",
        league_slug: (membership?.leagues as unknown as { slug: string } | null)?.slug ?? "",
        total_points: scores.reduce((s, ms) => s + ms.final_points, 0),
        matches_played: scores.length,
      };
    })
    .sort((a, b) => b.total_points - a.total_points);
}
