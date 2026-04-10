"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Season {
  id: number;
  name: string;
  is_active: boolean;
}

export default function CreateLeaguePage() {
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [maxOwners, setMaxOwners] = useState("10");
  const [purseBudget, setPurseBudget] = useState("20000");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("seasons")
      .select("id, name, is_active")
      .order("id", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSeasons(data);
          const active = data.find((s) => s.is_active);
          if (active) setSeasonId(active.id);
        }
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        season_id: seasonId,
        max_owners: parseInt(maxOwners) || 10,
        purse_budget: parseInt(purseBudget) || 20000,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create league");
      setLoading(false);
      return;
    }

    const league = await res.json();
    router.push(`/league/${league.slug}`);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 inline-block"
      >
        &larr; Back
      </Link>
      <h1 className="text-2xl font-bold mb-6">Create a League</h1>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">League Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dhruv's Fantasy League"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Season</label>
          <select
            value={seasonId ?? ""}
            onChange={(e) =>
              setSeasonId(e.target.value ? parseInt(e.target.value) : null)
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No season</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Owners</label>
            <input
              type="number"
              value={maxOwners}
              onChange={(e) => setMaxOwners(e.target.value)}
              min="2"
              max="20"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Purse Budget</label>
            <input
              type="number"
              value={purseBudget}
              onChange={(e) => setPurseBudget(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Creating..." : "Create League"}
        </button>
      </form>
    </div>
  );
}
