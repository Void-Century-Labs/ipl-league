"use client";

import { useState } from "react";
import type { PlayerStat } from "@/lib/player-stats";

export default function PlayerSearchTable({ players }: { players: PlayerStat[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.ipl_team ?? "").toLowerCase().includes(query.toLowerCase()) ||
          p.owner_name.toLowerCase().includes(query.toLowerCase())
      )
    : players;

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by player, IPL team, or owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[2rem_1fr_5rem_5rem_4.5rem_4.5rem_4.5rem_4.5rem_4rem] bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <span>#</span>
          <span>Player</span>
          <span>IPL Team</span>
          <span>Owner</span>
          <span className="text-right">Price</span>
          <span className="text-right">Runs</span>
          <span className="text-right">Wkts</span>
          <span className="text-right">Base Pts</span>
          <span className="text-right">MVP</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            No players found
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((player, idx) => (
              <div
                key={player.id}
                className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_5rem_5rem_4.5rem_4.5rem_4.5rem_4.5rem_4rem] items-center px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <span className="text-gray-400 text-xs">{idx + 1}</span>

                {/* Player name + badges */}
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium truncate">{player.name}</span>
                  {player.is_captain && (
                    <span className="shrink-0 inline-block px-1 py-0.5 text-xs font-bold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      C
                    </span>
                  )}
                  {player.is_vice_captain && (
                    <span className="shrink-0 inline-block px-1 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      VC
                    </span>
                  )}
                </span>

                {/* Mobile: compact secondary line */}
                <span className="sm:hidden text-right text-xs text-gray-500">
                  {player.total_points.toLocaleString()} pts
                </span>

                {/* Desktop columns */}
                <span className="hidden sm:block">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {player.ipl_team?.toUpperCase() ?? "—"}
                  </span>
                </span>
                <span className="hidden sm:block text-gray-600 dark:text-gray-400 truncate text-xs">
                  {player.owner_name}
                </span>
                <span className="hidden sm:block text-right tabular-nums text-gray-500 text-xs">
                  {player.purse_spent.toLocaleString()}
                </span>
                <span className="hidden sm:block text-right tabular-nums">
                  {player.total_runs.toLocaleString()}
                </span>
                <span className="hidden sm:block text-right tabular-nums">
                  {player.total_wickets}
                </span>
                <span className="hidden sm:block text-right tabular-nums font-semibold">
                  {player.total_points.toLocaleString()}
                </span>
                <span className="hidden sm:block text-right">
                  <MvpBadge score={player.mvp_score} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} player{filtered.length !== 1 ? "s" : ""}
          {query.trim() ? ` matching "${query.trim()}"` : ""}
        </p>
      )}
    </div>
  );
}

function MvpBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : score >= 50
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
      : score >= 25
      ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded tabular-nums ${color}`}>
      {score}
    </span>
  );
}
