import Link from "next/link";

export default function MatchesPage() {
  return (
    <div className="text-center py-16">
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
        Matches are now league-scoped
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
        Select a league from the home page to view its matches.
      </p>
      <Link
        href="/"
        className="text-blue-600 hover:underline text-sm mt-4 inline-block"
      >
        Go to Home
      </Link>
    </div>
  );
}
