import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

export const revalidate = 60; // revalidate every 60 seconds

export default async function Home() {
  const standings = await getLeaderboard();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          IPL 2026 Fantasy League Standings
        </p>
      </div>

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
    </div>
  );
}
