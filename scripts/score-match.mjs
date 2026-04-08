// Manually score a single match. Use when sync inserted the match row but
// failed to write player_match_scores rows.
//
// Usage:
//   node --env-file=.env.local scripts/score-match.mjs <cricapi_match_id>           # dry-run
//   node --env-file=.env.local scripts/score-match.mjs <cricapi_match_id> --apply
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const cricapiMatchId = process.argv[2];
if (!cricapiMatchId || cricapiMatchId.startsWith("--")) {
  console.error("Usage: score-match.mjs <cricapi_match_id> [--apply]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const apiKey = process.env.CRICAPI_KEY;

// 1. Find match row
const { data: matchRows } = await supabase
  .from("matches")
  .select("id, name, cricapi_match_id")
  .eq("cricapi_match_id", cricapiMatchId);
if (!matchRows || matchRows.length === 0) {
  console.error("Match not in DB:", cricapiMatchId);
  process.exit(1);
}
const match = matchRows[0];
console.log(`Match: ${match.name} (internal id=${match.id})\n`);

// 2. Existing scores?
const { data: existing } = await supabase
  .from("player_match_scores")
  .select("id")
  .eq("match_id", match.id);
console.log(`Existing player_match_scores rows: ${existing?.length ?? 0}`);

// 3. Fetch scorecard from CricAPI
const url = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${cricapiMatchId}`;
const res = await fetch(url);
const json = await res.json();
if (json.status !== "success" || !json.data?.scorecard) {
  console.error("CricAPI returned no scorecard:", json);
  process.exit(1);
}
const scorecard = json.data.scorecard;
console.log(`Scorecard innings: ${scorecard.length}\n`);

// 4. Load league players
const { data: players } = await supabase
  .from("players")
  .select("id, name, cricapi_player_id, is_captain, is_vice_captain");
console.log(`League players: ${players.length}\n`);

// 5. Replicate extractPlayerStats + calculatePoints
function extractStats(innings, cricapiPlayerId) {
  let runs = 0, wickets = 0, sixes = 0;
  let found = false;
  for (const inn of innings) {
    for (const bat of inn.batting ?? []) {
      if (bat.batsman?.id === cricapiPlayerId) {
        runs += bat.r ?? 0;
        sixes += bat["6s"] ?? 0;
        found = true;
      }
    }
    for (const bowl of inn.bowling ?? []) {
      if (bowl.bowler?.id === cricapiPlayerId) {
        wickets += bowl.w ?? 0;
        found = true;
      }
    }
  }
  if (!found) return null;
  return {
    runs, wickets, sixes, catches: 0,
    isCentury: runs >= 100,
    isFiveWicket: wickets >= 5,
    isHatTrick: false,
    isSixSixes: false,
  };
}
function calcPoints(stats, isCaptain, isViceCaptain) {
  const raw = stats.runs + stats.wickets * 25 +
    (stats.isCentury ? 100 : 0) +
    (stats.isFiveWicket ? 100 : 0);
  const mult = isCaptain ? 2 : isViceCaptain ? 1.5 : 1;
  return { raw, final: raw * mult };
}

const rowsToWrite = [];
let foundCount = 0, totalPoints = 0;
for (const p of players) {
  if (!p.cricapi_player_id) continue;
  const stats = extractStats(scorecard, p.cricapi_player_id);
  if (!stats) continue;
  foundCount++;
  const pts = calcPoints(stats, p.is_captain, p.is_vice_captain);
  totalPoints += pts.final;
  rowsToWrite.push({
    player_id: p.id,
    match_id: match.id,
    runs: stats.runs,
    wickets: stats.wickets,
    catches: 0,
    sixes: stats.sixes,
    is_century: stats.isCentury,
    is_five_wicket: stats.isFiveWicket,
    is_hat_trick: false,
    is_six_sixes: false,
    raw_points: pts.raw,
    final_points: pts.final,
  });
  console.log(`  ${p.name.padEnd(28)} runs=${String(stats.runs).padStart(3)} wkts=${stats.wickets} 6s=${stats.sixes} → raw=${pts.raw} final=${pts.final}${p.is_captain ? " (C)" : p.is_vice_captain ? " (VC)" : ""}`);
}
console.log(`\nFound ${foundCount} league players in scorecard. Total points to add: ${totalPoints}`);

if (!APPLY) {
  console.log("\nDry-run. Re-run with --apply to write rows.");
  process.exit(0);
}
if (rowsToWrite.length === 0) {
  console.log("Nothing to write.");
  process.exit(0);
}

const { error } = await supabase
  .from("player_match_scores")
  .upsert(rowsToWrite, { onConflict: "player_id,match_id" });
if (error) {
  console.error("Upsert error:", error);
  process.exit(1);
}
console.log(`\nWrote ${rowsToWrite.length} score rows.`);
