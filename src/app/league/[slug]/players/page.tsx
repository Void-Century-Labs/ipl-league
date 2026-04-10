import { getLeagueBySlug } from "@/lib/queries";
import { getAllPlayerStats } from "@/lib/player-stats";
import PlayerSearchTable from "@/components/PlayerSearchTable";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function LeaguePlayersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const players = await getAllPlayerStats(league.id);
  const sorted = [...players].sort((a, b) => b.total_points - a.total_points);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Players</p>
          <p className="text-xl font-bold tabular-nums">{players.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Runs</p>
          <p className="text-xl font-bold tabular-nums">
            {players.reduce((s, p) => s + p.total_runs, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Wickets</p>
          <p className="text-xl font-bold tabular-nums">
            {players.reduce((s, p) => s + p.total_wickets, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Points</p>
          <p className="text-xl font-bold tabular-nums">
            {players.reduce((s, p) => s + p.total_points, 0).toLocaleString()}
          </p>
        </div>
      </div>

      <PlayerSearchTable players={sorted} />
    </div>
  );
}
