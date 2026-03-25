import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { searchPlayer } from "@/lib/cricapi";

function checkAuth(request: Request): boolean {
  return request.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

type CricAPIPlayer = { id: string; name: string; country: string };

function findBestMatch(results: CricAPIPlayer[], query: string): CricAPIPlayer | null {
  if (results.length === 0) return null;
  const q = query.toLowerCase();
  return results.find((r) => r.name.toLowerCase() === q) ?? results[0];
}

// Generates progressively shorter search terms to use as fallbacks:
// "Anuj Rawat Raghvanshi" → ["Anuj Rawat Raghvanshi", "Raghvanshi", "Anuj"]
function searchTerms(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  const terms = [name];
  if (parts.length > 1) {
    terms.push(parts[parts.length - 1]); // last name
    terms.push(parts[0]);                // first name
  }
  return terms;
}

async function resolvePlayer(name: string): Promise<CricAPIPlayer | null> {
  for (const term of searchTerms(name)) {
    const results = await searchPlayer(term);
    const match = findBestMatch(results, name);
    if (match) return match;
  }
  return null;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only fetch players still missing a cricapi_player_id — safe to re-run as a retry
  const { data: players, error } = await supabaseAdmin
    .from("players")
    .select("id, name")
    .is("cricapi_player_id", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matched: { id: number; name: string; cricapi_id: string; cricapi_name: string }[] = [];
  const unmatched: { id: number; name: string }[] = [];

  for (const player of players ?? []) {
    const best = await resolvePlayer(player.name);

    if (!best) {
      unmatched.push({ id: player.id, name: player.name });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("players")
      .update({ cricapi_player_id: best.id })
      .eq("id", player.id);

    if (updateError) {
      unmatched.push({ id: player.id, name: player.name });
    } else {
      matched.push({
        id: player.id,
        name: player.name,
        cricapi_id: best.id,
        cricapi_name: best.name,
      });
    }
  }

  return NextResponse.json({
    status: "success",
    matched: matched.length,
    unmatched: unmatched.length,
    details: { matched, unmatched },
  });
}
