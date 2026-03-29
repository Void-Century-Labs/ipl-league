import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface MatchScore {
  final_points: number;
  runs: number;
  wickets: number;
  match: {
    name: string;
    match_date: string;
  } | null;
}

interface Player {
  id: number;
  name: string;
  ipl_team: string | null;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  player_match_scores: MatchScore[];
}

async function getOwnerWithPlayers(ownerName: string) {
  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("*")
    .eq("name", ownerName)
    .single();

  if (ownerError || !owner) return null;

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(
      `
      *,
      player_match_scores (
        final_points,
        runs,
        wickets,
        match:matches (
          name,
          match_date
        )
      )
    `
    )
    .eq("owner_id", owner.id)
    .order("purse_spent", { ascending: false });

  if (playersError) return null;

  return {
    owner,
    players: (players ?? []) as Player[],
  };
}

export const revalidate = 60;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const ownerName = decodeURIComponent(name);
  const data = await getOwnerWithPlayers(ownerName);

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-500">Team not found</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
          Back to leaderboard
        </Link>
      </div>
    );
  }

  const { owner, players } = data;
  const totalPoints = players.reduce(
    (sum, p) =>
      sum +
      p.player_match_scores.reduce(
        (s: number, ms: MatchScore) => s + ms.final_points,
        0
      ),
    0
  );

  // Sort players: most points first
  const sorted = [...players].sort((a, b) => {
    const apts = a.player_match_scores.reduce((s, ms) => s + ms.final_points, 0);
    const bpts = b.player_match_scores.reduce((s, ms) => s + ms.final_points, 0);
    return bpts - apts;
  });

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 inline-block"
      >
        &larr; Back to leaderboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {owner.name}&apos;s Team
        </h1>
        <div className="flex gap-6 mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Total Points:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {totalPoints.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_6rem_4rem_4rem] bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <span>#</span>
          <span>Player</span>
          <span className="hidden sm:block">IPL Team</span>
          <span className="hidden sm:block text-right">Matches</span>
          <span className="text-right">Pts</span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sorted.map((player, idx) => {
            const pts = player.player_match_scores.reduce(
              (s: number, ms: MatchScore) => s + ms.final_points,
              0
            );
            const matchCount = player.player_match_scores.length;
            const scores = [...player.player_match_scores].sort((a, b) =>
              (b.match?.match_date ?? "") > (a.match?.match_date ?? "") ? 1 : -1
            );

            return (
              <details key={player.id} className="group">
                <summary className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_6rem_4rem_4rem] items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors list-none">
                  <span className="text-gray-400">{idx + 1}</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={
                        player.is_captain
                          ? "font-extrabold text-base truncate"
                          : player.is_vice_captain
                          ? "font-bold truncate"
                          : "font-medium truncate"
                      }
                    >
                      {player.name}
                    </span>
                    {player.is_captain && (
                      <span className="shrink-0 inline-block px-1.5 py-0.5 text-xs font-bold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        C
                      </span>
                    )}
                    {player.is_vice_captain && (
                      <span className="shrink-0 inline-block px-1.5 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        VC
                      </span>
                    )}
                    {matchCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold group-open:hidden">+</span>
                    )}
                  </span>
                  <span className="hidden sm:block">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {player.ipl_team?.toUpperCase() ?? "—"}
                    </span>
                  </span>
                  <span className="hidden sm:block text-right tabular-nums text-gray-500">{matchCount}</span>
                  <span className="text-right font-semibold tabular-nums">{pts.toLocaleString()}</span>
                </summary>

                {matchCount > 0 && (
                  <div className="px-4 pb-3 pt-1">
                    <div className="rounded-md border border-gray-100 dark:border-gray-800 overflow-hidden text-xs">
                      <div className="grid grid-cols-[1fr_3rem_3rem_3.5rem] bg-gray-50 dark:bg-gray-800/50 text-gray-400 px-3 py-1.5 font-medium">
                        <span>Match</span>
                        <span className="text-right">Runs</span>
                        <span className="text-right">Wkts</span>
                        <span className="text-right">Pts</span>
                      </div>
                      {scores.map((ms, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_3rem_3rem_3.5rem] px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                        >
                          <span className="truncate">{ms.match?.name ?? "—"}</span>
                          <span className="text-right tabular-nums">{ms.runs}</span>
                          <span className="text-right tabular-nums">{ms.wickets}</span>
                          <span className="text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">{ms.final_points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
