"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

interface PlayerWithOwner {
  id: number;
  name: string;
  ipl_team: string | null;
  owner_id: number;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  cricapi_player_id: string | null;
  owners: { name: string };
}

interface OwnerOption {
  id: number;
  name: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [players, setPlayers] = useState<PlayerWithOwner[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Add player form
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [newOwnerId, setNewOwnerId] = useState<number>(0);
  const [newPurse, setNewPurse] = useState("");
  const [newCricapiId, setNewCricapiId] = useState("");

  const [authMode, setAuthMode] = useState<"supabase" | "password" | null>(null);

  const getStoredPassword = () => sessionStorage.getItem("admin_password") ?? "";

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(authMode === "password"
        ? { "x-admin-password": getStoredPassword() }
        : {}),
    }),
    [authMode]
  );

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/players", { headers: headers() });
    if (res.ok) {
      const data: PlayerWithOwner[] = await res.json();
      setPlayers(data);
      // Extract unique owners
      const ownerMap = new Map<number, string>();
      data.forEach((p) => ownerMap.set(p.owner_id, p.owners.name));
      setOwners(Array.from(ownerMap, ([id, name]) => ({ id, name })));
      if (!newOwnerId && ownerMap.size > 0) {
        setNewOwnerId(ownerMap.keys().next().value!);
      }
    }
    setLoading(false);
  }, [headers, newOwnerId]);

  useEffect(() => {
    // Check Supabase auth first, fallback to stored password
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthenticated(true);
        setAuthMode("supabase");
      } else {
        const stored = sessionStorage.getItem("admin_password");
        if (stored) {
          setAuthenticated(true);
          setAuthMode("password");
          setPassword(stored);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (authenticated) fetchPlayers();
  }, [authenticated, fetchPlayers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthMode("password");
      setAuthenticated(true);
    } else {
      setAuthError("Invalid password");
    }
  };

  const toggleCaptain = async (player: PlayerWithOwner) => {
    await fetch("/api/admin/players", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        id: player.id,
        is_captain: !player.is_captain,
      }),
    });
    fetchPlayers();
  };

  const toggleVC = async (player: PlayerWithOwner) => {
    await fetch("/api/admin/players", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        id: player.id,
        is_vice_captain: !player.is_vice_captain,
      }),
    });
    fetchPlayers();
  };

  const removePlayer = async (id: number) => {
    if (!confirm("Remove this player?")) return;
    await fetch("/api/admin/players", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ id }),
    });
    fetchPlayers();
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/players", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: newName,
        ipl_team: newTeam || null,
        owner_id: newOwnerId,
        purse_spent: parseInt(newPurse) || 0,
        cricapi_player_id: newCricapiId || null,
      }),
    });
    setNewName("");
    setNewTeam("");
    setNewPurse("");
    setNewCricapiId("");
    fetchPlayers();
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-24">
        <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  // Group players by owner
  const grouped = new Map<string, PlayerWithOwner[]>();
  players.forEach((p) => {
    const ownerName = p.owners.name;
    if (!grouped.has(ownerName)) grouped.set(ownerName, []);
    grouped.get(ownerName)!.push(p);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Admin Panel</h1>

      {/* Add Player Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold mb-3">Add Player</h2>
        <form onSubmit={addPlayer} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name *</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">IPL Team</label>
            <input
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              placeholder="e.g. CSK"
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Owner</label>
            <select
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(Number(e.target.value))}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Purse</label>
            <input
              type="number"
              value={newPurse}
              onChange={(e) => setNewPurse(e.target.value)}
              placeholder="0"
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CricAPI ID</label>
            <input
              value={newCricapiId}
              onChange={(e) => setNewCricapiId(e.target.value)}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Add
          </button>
        </form>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}

      {/* Players grouped by owner */}
      {Array.from(grouped).map(([ownerName, ownerPlayers]) => (
        <div key={ownerName} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{ownerName}</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 font-medium">Player</th>
                  <th className="px-4 py-2 font-medium">Team</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium text-right">Purse</th>
                  <th className="px-4 py-2 font-medium">CricAPI ID</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ownerPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {p.ipl_team?.toUpperCase() ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-1">
                      <button
                        onClick={() => toggleCaptain(p)}
                        className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                          p.is_captain
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/50"
                        }`}
                      >
                        C
                      </button>
                      <button
                        onClick={() => toggleVC(p)}
                        className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                          p.is_vice_captain
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 hover:bg-purple-50 dark:hover:bg-purple-900/50"
                        }`}
                      >
                        VC
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.purse_spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                      {p.cricapi_player_id ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
