import Link from "next/link";
import { createClient } from "@/lib/supabase-ssr";
import { getUserLeagues, getUserTopPlayers } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

async function getAllLeagues() {
  const { data } = await supabase
    .from("leagues")
    .select("id, name, slug, created_at, seasons(name)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function Home() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const isLoggedIn = !!user;
  const userLeagues = isLoggedIn ? await getUserLeagues(user.id) : [];
  const topPlayers = isLoggedIn ? await getUserTopPlayers(user.id) : [];
  const allLeagues = await getAllLeagues();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoggedIn ? "Your Dashboard" : "IPL Fantasy League"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isLoggedIn
            ? "Your leagues, top players, and stats at a glance"
            : "Log in to see your personalized dashboard, or browse leagues below"}
        </p>
      </div>

      {/* User's Leagues */}
      {isLoggedIn && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Your Leagues
            </h2>
            <Link
              href="/leagues/create"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create League
            </Link>
          </div>

          {userLeagues.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                You haven&apos;t joined any leagues yet.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Create a new league or join one with an invite code.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userLeagues.map((membership) => {
                const league = membership.leagues as unknown as {
                  id: string;
                  name: string;
                  slug: string;
                  seasons: { name: string } | null;
                };
                return (
                  <Link
                    key={league.id}
                    href={`/league/${league.slug}`}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold truncate">{league.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {league.seasons && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium">
                          {league.seasons.name}
                        </span>
                      )}
                      <span>as {membership.display_name}</span>
                      {membership.role === "admin" && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* User's Top Players */}
      {isLoggedIn && topPlayers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Your Top Players
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_6rem_5rem_5rem] bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
              <span>#</span>
              <span>Player</span>
              <span className="hidden sm:block">League</span>
              <span className="hidden sm:block text-right">Matches</span>
              <span className="text-right">Pts</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {topPlayers.slice(0, 10).map((player, idx) => (
                <div
                  key={player.id}
                  className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_6rem_5rem_5rem] items-center px-4 py-2.5 text-sm"
                >
                  <span className="text-gray-400">{idx + 1}</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium truncate">{player.name}</span>
                    {player.is_captain && (
                      <span className="shrink-0 px-1.5 py-0.5 text-xs font-bold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        C
                      </span>
                    )}
                    {player.is_vice_captain && (
                      <span className="shrink-0 px-1.5 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        VC
                      </span>
                    )}
                    {player.ipl_team && (
                      <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {player.ipl_team.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:block text-xs text-gray-400 truncate">
                    <Link
                      href={`/league/${player.league_slug}`}
                      className="hover:underline"
                    >
                      {player.league_name}
                    </Link>
                  </span>
                  <span className="hidden sm:block text-right tabular-nums text-gray-500">
                    {player.matches_played}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {player.total_points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Leagues (browse) */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          {isLoggedIn ? "All Leagues" : "Browse Leagues"}
        </h2>

        {allLeagues.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No leagues yet</p>
            <p className="text-sm mt-1">
              {isLoggedIn
                ? "Create the first league to get started!"
                : "Log in to create or join a league."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/league/${league.slug}`}
                className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{league.name}</h3>
                    {league.seasons && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(league.seasons as unknown as { name: string })?.name}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">View &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Join by invite code */}
      {isLoggedIn && (
        <section className="mt-10">
          <div className="bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Have an invite code?
            </p>
            <Link
              href="/leagues/join"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Join a league with invite code &rarr;
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
