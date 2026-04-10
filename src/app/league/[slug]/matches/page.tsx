import { getLeagueBySlug } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface MatchWithScores {
  id: number;
  name: string;
  match_date: string;
  status: string;
  teams: string[];
  venue: string | null;
  result: string | null;
  player_match_scores: {
    runs: number;
    wickets: number;
    sixes: number;
    final_points: number;
    player: {
      name: string;
      ipl_team: string | null;
      league_members: { display_name: string } | null;
    };
  }[];
}

async function getLeagueMatches(leagueId: string, seasonId: number): Promise<MatchWithScores[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      player_match_scores (
        runs, wickets, sixes, final_points,
        player:players!inner (
          name, ipl_team,
          league_members (display_name)
        )
      )
    `
    )
    .eq("season_id", seasonId)
    .order("match_date", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Failed to fetch matches:", error);
    return [];
  }

  // Filter player_match_scores to only include players in this league
  const filtered = (data ?? []).map((m) => ({
    ...m,
    player_match_scores: (m.player_match_scores ?? []).filter(
      (pms: { player: { league_members: unknown } }) => pms.player?.league_members
    ),
  }));

  return filtered as unknown as MatchWithScores[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const revalidate = 60;

export default async function LeagueMatchesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const seasonId = league.season_id;
  const matches = seasonId ? await getLeagueMatches(league.id, seasonId) : [];

  return (
    <div>
      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No matches synced yet</p>
          <p className="text-sm mt-1">
            Matches will appear here once the season begins.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const scorers = match.player_match_scores
              .filter((s) => s.final_points > 0)
              .sort((a, b) => b.final_points - a.final_points);

            return (
              <div
                key={match.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{match.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDate(match.match_date)}
                      {match.venue && ` — ${match.venue}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      match.status === "completed"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    }`}
                  >
                    {match.status}
                  </span>
                </div>

                {match.result && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {match.result}
                  </p>
                )}

                {scorers.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                      Fantasy Point Scorers
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {scorers.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded px-3 py-1.5"
                        >
                          <div>
                            <span className="font-medium">
                              {s.player.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({s.player.league_members?.display_name})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {s.runs > 0 && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {s.runs}r
                              </span>
                            )}
                            {s.wickets > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                {s.wickets}w
                              </span>
                            )}
                            <span className="font-bold">
                              {s.final_points}pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
