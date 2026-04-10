import Link from "next/link";
import { getLeagueBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) notFound();

  const seasonName = (league.seasons as unknown as { name: string } | null)?.name;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; All Leagues
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">
          {league.name}
        </h1>
        {seasonName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {seasonName}
          </p>
        )}
      </div>

      <nav className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2 text-sm font-medium overflow-x-auto">
        <Link
          href={`/league/${slug}`}
          className="px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Leaderboard
        </Link>
        <Link
          href={`/league/${slug}/players`}
          className="px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Players
        </Link>
        <Link
          href={`/league/${slug}/matches`}
          className="px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Matches
        </Link>
      </nav>

      {children}
    </div>
  );
}
