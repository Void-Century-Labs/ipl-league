import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Player {
  id: number;
  name: string;
  ipl_team: string | null;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  player_match_scores: { final_points: number }[];
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
        final_points
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
        (s: number, ms: { final_points: number }) => s + ms.final_points,
        0
      ),
    0
  );
  const totalPurse = players.reduce((sum, p) => sum + p.purse_spent, 0);

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
          <span>
            Purse Used:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {totalPurse.toLocaleString()}
            </strong>{" "}
            / 20,000
          </span>
          <span>
            Purse Remaining:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {(20000 - totalPurse).toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">IPL Team</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Purse</th>
              <th className="px-4 py-3 font-medium text-right">Matches</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {players.map((player, idx) => {
              const pts = player.player_match_scores.reduce(
                (s: number, ms: { final_points: number }) =>
                  s + ms.final_points,
                0
              );
              const matchCount = player.player_match_scores.length;

              return (
                <tr
                  key={player.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {player.ipl_team?.toUpperCase() ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {player.is_captain && (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        C
                      </span>
                    )}
                    {player.is_vice_captain && (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        VC
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {player.purse_spent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {matchCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {pts.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
