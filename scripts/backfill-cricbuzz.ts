// One-time backfill of unsynced IPL matches via Cricbuzz (RapidAPI).
// Fetches the IPL series matches, dedups against existing matches in DB by
// (date_day, team-substring-match), then for each unsynced ended match
// pulls /mcenter/v1/{cbMatchId}/scard, aggregates per-player stats by name,
// matches against players.name, and inserts matches + player_match_scores.
//
// Usage:
//   set -a; source .env.local; set +a
//   RAPIDAPI_KEY=<key> npx tsx scripts/backfill-cricbuzz.ts             # do it
//   RAPIDAPI_KEY=<key> npx tsx scripts/backfill-cricbuzz.ts --dry-run   # preview only
//
// Env: RAPIDAPI_KEY (required), CRICBUZZ_SERIES_ID (default 9241 = IPL 2026),
//      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local).
//
// IMPORTANT: after this backfill, the existing CricAPI cron will not
// recognize backfilled matches (different name format) and will try to
// re-fetch them via CricAPI on its next run. Either disable the cron or
// migrate it to Cricbuzz before the next scheduled run.

import { createClient } from "@supabase/supabase-js";
import { calculatePoints } from "../src/lib/points";

const HOST = "cricbuzz-cricket.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const SERIES_ID = process.env.CRICBUZZ_SERIES_ID ?? "9241";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!RAPIDAPI_KEY) {
  console.error("RAPIDAPI_KEY required");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase env vars missing — did you `set -a; source .env.local; set +a`?");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const headers: Record<string, string> = {
  "X-RapidAPI-Host": HOST,
  "X-RapidAPI-Key": RAPIDAPI_KEY,
};

let totalCalls = 0;
async function call<T>(path: string): Promise<T> {
  totalCalls++;
  const res = await fetch(`https://${HOST}${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

interface CbMatchInfo {
  matchId: number;
  matchDesc?: string;
  matchFormat?: string;
  startDate?: string | number;
  state?: string;
  status?: string;
  team1?: { teamId?: number; teamName?: string; teamSName?: string };
  team2?: { teamId?: number; teamName?: string; teamSName?: string };
  venueInfo?: { ground?: string; city?: string };
}

interface CbBatter {
  id?: number;
  name?: string;
  runs?: number;
  fours?: number;
  sixes?: number;
  balls?: number;
  outdec?: string;
}
interface CbBowler {
  id?: number;
  name?: string;
  overs?: number | string;
  runs?: number;
  wickets?: number;
}
interface CbInnings {
  inningsid?: number;
  batsman?: CbBatter[];
  bowler?: CbBowler[];
  batteamname?: string;
}
interface CbScorecard {
  scorecard?: CbInnings[];
  ismatchcomplete?: boolean;
}

async function main() {
  // ---- 1. Fetch Cricbuzz series ----
  console.log(`Fetching Cricbuzz series ${SERIES_ID}…`);
  const series = await call<{
    matchDetails?: Array<{ matchDetailsMap?: { match?: Array<{ matchInfo?: CbMatchInfo }> } }>;
  }>(`/series/v1/${SERIES_ID}`);
  const cbMatches: CbMatchInfo[] = (series.matchDetails ?? []).flatMap((d) =>
    (d.matchDetailsMap?.match ?? []).map((m) => m.matchInfo).filter((x): x is CbMatchInfo => !!x)
  );
  const ended = cbMatches.filter((m) => (m.state ?? "").toLowerCase() === "complete");
  console.log(`  total: ${cbMatches.length}, ended: ${ended.length}`);

  // ---- 2. Load existing matches and league players ----
  const { data: existing, error: exErr } = await supabase
    .from("matches")
    .select("id, name, match_date, teams");
  if (exErr) throw exErr;
  const { data: leaguePlayers, error: plErr } = await supabase
    .from("players")
    .select("id, name, is_captain, is_vice_captain");
  if (plErr) throw plErr;

  console.log(`  existing matches in DB: ${existing?.length ?? 0}`);
  console.log(`  league players: ${leaguePlayers?.length ?? 0}`);

  const playerByName: Record<string, { id: number; is_captain: boolean; is_vice_captain: boolean }> = {};
  for (const p of leaguePlayers ?? []) {
    playerByName[norm(p.name)] = {
      id: p.id,
      is_captain: !!p.is_captain,
      is_vice_captain: !!p.is_vice_captain,
    };
  }

  // ---- 3. Filter to unsynced ----
  function isAlreadySynced(cb: CbMatchInfo): boolean {
    const cbDay = new Date(Number(cb.startDate ?? 0)).toISOString().slice(0, 10);
    const cbTeams = [cb.team1?.teamName, cb.team2?.teamName].map(norm).filter(Boolean);
    return (existing ?? []).some((ex: { match_date?: string; teams?: string[] }) => {
      const exDay = (ex.match_date ?? "").slice(0, 10);
      if (exDay !== cbDay) return false;
      const exTeams = (ex.teams ?? []).map(norm);
      const bothMatch = cbTeams.every((cbT) =>
        exTeams.some((exT) => exT.includes(cbT) || cbT.includes(exT))
      );
      return bothMatch;
    });
  }

  const toSync = ended.filter((m) => !isAlreadySynced(m));
  console.log(`  to backfill: ${toSync.length}\n`);

  if (toSync.length === 0) {
    console.log("Nothing to backfill — all ended matches already in DB.");
    return;
  }

  if (DRY_RUN) {
    console.log("[dry-run] would backfill:");
    for (const m of toSync) {
      const day = new Date(Number(m.startDate ?? 0)).toISOString().slice(0, 10);
      console.log(`  ${day}  ${m.team1?.teamSName} vs ${m.team2?.teamSName}  cbId=${m.matchId}`);
    }
    console.log(`\nestimated calls: 1 (series, already done) + ${toSync.length} (scorecards) = ${1 + toSync.length}`);
    return;
  }

  // ---- 4. Backfill loop ----
  let inserted = 0;
  let scoreRowsAdded = 0;
  const unmatchedAcrossMatches = new Set<string>();

  for (const m of toSync) {
    const label = `${m.team1?.teamSName} vs ${m.team2?.teamSName} (cbId=${m.matchId})`;
    process.stdout.write(`Fetching ${label}… `);
    let scard: CbScorecard;
    try {
      scard = await call<CbScorecard>(`/mcenter/v1/${m.matchId}/scard`);
    } catch (e) {
      console.log(`✗ ${(e as Error).message}`);
      continue;
    }
    const innings = scard.scorecard ?? [];
    if (innings.length === 0) {
      console.log("✗ no innings");
      continue;
    }

    // Aggregate per-player stats by normalized name
    const stats: Record<
      string,
      { displayName: string; runs: number; wickets: number; sixes: number }
    > = {};
    const ensure = (rawName: string) => {
      const key = norm(rawName);
      return (stats[key] ??= { displayName: rawName, runs: 0, wickets: 0, sixes: 0 });
    };
    for (const inn of innings) {
      for (const b of inn.batsman ?? []) {
        if (!b.name) continue;
        const s = ensure(b.name);
        s.runs += b.runs ?? 0;
        s.sixes += b.sixes ?? 0;
      }
      for (const w of inn.bowler ?? []) {
        if (!w.name) continue;
        const s = ensure(w.name);
        s.wickets += w.wickets ?? 0;
      }
    }

    // Match against league players
    const scoreRows: Array<Record<string, unknown>> = [];
    const unmatched: string[] = [];
    for (const [normName, agg] of Object.entries(stats)) {
      const player = playerByName[normName];
      if (!player) {
        unmatched.push(agg.displayName);
        continue;
      }
      const points = calculatePoints(
        {
          runs: agg.runs,
          wickets: agg.wickets,
          catches: 0,
          sixes: agg.sixes,
          isCentury: agg.runs >= 100,
          isFiveWicket: agg.wickets >= 5,
          isHatTrick: false,
          isSixSixes: false,
        },
        { isCaptain: player.is_captain, isViceCaptain: player.is_vice_captain }
      );
      scoreRows.push({
        player_id: player.id,
        runs: agg.runs,
        wickets: agg.wickets,
        catches: 0,
        sixes: agg.sixes,
        is_century: agg.runs >= 100,
        is_five_wicket: agg.wickets >= 5,
        is_hat_trick: false,
        is_six_sixes: false,
        raw_points: points.rawTotal,
        final_points: points.finalTotal,
      });
    }

    // Insert match row
    const matchDateIso = new Date(Number(m.startDate ?? 0)).toISOString();
    const matchName = `${m.team1?.teamName} vs ${m.team2?.teamName}, ${m.matchDesc}, Indian Premier League 2026`;
    const venue = [m.venueInfo?.ground, m.venueInfo?.city].filter(Boolean).join(", ");

    const { data: insertedMatch, error: matchErr } = await supabase
      .from("matches")
      .insert({
        cricapi_match_id: null,
        name: matchName,
        match_date: matchDateIso,
        status: "completed",
        teams: [m.team1?.teamName, m.team2?.teamName].filter(Boolean),
        venue,
        result: m.status,
      })
      .select("id")
      .single();

    if (matchErr || !insertedMatch) {
      console.log(`✗ match insert: ${matchErr?.message ?? "no row"}`);
      continue;
    }
    inserted++;

    if (scoreRows.length > 0) {
      const { error: scErr } = await supabase
        .from("player_match_scores")
        .insert(scoreRows.map((r) => ({ ...r, match_id: insertedMatch.id })));
      if (scErr) {
        console.log(`✗ score insert: ${scErr.message} — rolling back match`);
        await supabase.from("matches").delete().eq("id", insertedMatch.id);
        inserted--;
        continue;
      }
      scoreRowsAdded += scoreRows.length;
    }

    console.log(`✓ ${scoreRows.length} score rows${unmatched.length ? `  (unmatched: ${unmatched.length})` : ""}`);
    for (const u of unmatched) unmatchedAcrossMatches.add(u);
  }

  // ---- 5. Summary ----
  console.log(`\n=== Summary ===`);
  console.log(`RapidAPI calls: ${totalCalls}`);
  console.log(`Matches inserted: ${inserted}/${toSync.length}`);
  console.log(`Score rows added: ${scoreRowsAdded}`);
  if (unmatchedAcrossMatches.size > 0) {
    console.log(`\nNon-league players in scorecards (expected — these aren't in your league):`);
    console.log(`  ${[...unmatchedAcrossMatches].slice(0, 30).join(", ")}${unmatchedAcrossMatches.size > 30 ? ", …" : ""}`);
    console.log(`  (Only a problem if you see actual league players here — name format mismatch.)`);
  }
  console.log(`\n⚠ The CricAPI cron at /api/cron/sync-matches will not recognize these`);
  console.log(`   backfilled matches and may re-attempt them. Disable it or migrate to`);
  console.log(`   Cricbuzz before its next scheduled run.`);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
