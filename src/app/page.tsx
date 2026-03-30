import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAllPlayerStats, type PlayerStat } from "@/lib/player-stats";

interface OwnerStanding {
  owner_id: number;
  name: string;
  total_points: number;
  rank: number;
}

async function getLeaderboard(): Promise<OwnerStanding[]> {
  const { data, error } = await supabase
    .from("owner_standings")
    .select("*")
    .order("rank", { ascending: true });

  if (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
  return data ?? [];
}

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-700";
    case 2:
      return "bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600";
    case 3:
      return "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700";
    default:
      return "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800";
  }
}

function getRankBadge(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-yellow-400 text-yellow-900";
    case 2:
      return "bg-gray-300 text-gray-800";
    case 3:
      return "bg-orange-400 text-orange-900";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function getBestBatsman(players: PlayerStat[]): PlayerStat | null {
  const active = players.filter((p) => p.total_runs > 0);
  if (active.length === 0) return null;
  return active.reduce((best, p) => (p.total_runs > best.total_runs ? p : best));
}

function getBestBowler(players: PlayerStat[]): PlayerStat | null {
  const active = players.filter((p) => p.total_wickets > 0);
  if (active.length === 0) return null;
  return active.reduce((best, p) =>
    p.total_wickets > best.total_wickets ? p : best
  );
}

function getBestAllRounder(players: PlayerStat[]): PlayerStat | null {
  // Must have contributed with both bat and ball
  const allRounders = players.filter(
    (p) => p.total_runs > 0 && p.total_wickets > 0
  );
  if (allRounders.length === 0) return null;
  return allRounders.reduce((best, p) =>
    p.total_points > best.total_points ? p : best
  );
}

function getBestMvp(players: PlayerStat[]): PlayerStat | null {
  const active = players.filter((p) => p.total_points > 0);
  if (active.length === 0) return null;
  return active.reduce((best, p) => (p.mvp_score > best.mvp_score ? p : best));
}

interface HighlightCardProps {
  label: string;
  player: PlayerStat;
  stat: string;
  statLabel: string;
  accent: string;
}

function HighlightCard({ label, player, stat, statLabel, accent }: HighlightCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-lg p-4 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
        {label}
      </p>
      <p className="text-lg font-bold truncate">{player.name}</p>
      <div className="flex items-center gap-2 mt-1">
        {player.ipl_team && (
          <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {player.ipl_team.toUpperCase()}
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {player.owner_name}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{stat}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{statLabel}</span>
      </div>
    </div>
  );
}

export const revalidate = 60;

export default async function Home() {
  const [standings, players] = await Promise.all([
    getLeaderboard(),
    getAllPlayerStats(),
  ]);

  const bestBatsman = getBestBatsman(players);
  const bestBowler = getBestBowler(players);
  const bestAllRounder = getBestAllRounder(players);
  const bestMvp = getBestMvp(players);
  const hasHighlights = bestBatsman || bestBowler || bestAllRounder || bestMvp;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          IPL 2026 Fantasy League
        </p>
      </div>

      {hasHighlights && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Highlights
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {bestBatsman && (
              <HighlightCard
                label="Best Batsman"
                player={bestBatsman}
                stat={bestBatsman.total_runs.toLocaleString()}
                statLabel="runs"
                accent="border-blue-200 dark:border-blue-900"
              />
            )}
            {bestBowler && (
              <HighlightCard
                label="Best Bowler"
                player={bestBowler}
                stat={bestBowler.total_wickets.toString()}
                statLabel="wickets"
                accent="border-green-200 dark:border-green-900"
              />
            )}
            {bestAllRounder && (
              <HighlightCard
                label="Best All-rounder"
                player={bestAllRounder}
                stat={bestAllRounder.total_points.toLocaleString()}
                statLabel="pts"
                accent="border-purple-200 dark:border-purple-900"
              />
            )}
            {bestMvp && (
              <HighlightCard
                label="Best MVP"
                player={bestMvp}
                stat={bestMvp.mvp_score.toString()}
                statLabel="/ 100"
                accent="border-yellow-200 dark:border-yellow-900"
              />
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          <strong>The Reckoning Table</strong>
        </h2>

        {standings.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm mt-1">
              Points will appear once IPL 2026 matches begin and scores are
              synced.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {standings.map((owner) => (
              <Link
                key={owner.owner_id}
                href={`/team/${encodeURIComponent(owner.name)}`}
                className={`block border rounded-lg p-4 transition-shadow hover:shadow-md ${getRankStyle(owner.rank)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadge(owner.rank)}`}
                    >
                      {owner.rank}
                    </span>
                    <span className="text-lg font-semibold">{owner.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tabular-nums">
                      {owner.total_points.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                      pts
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
