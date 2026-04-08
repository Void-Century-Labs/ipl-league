// Debug a specific match: is it in the matches table? Does it have score rows?
// And — fetch its scorecard from CricAPI to see what the sync would do.
import { createClient } from "@supabase/supabase-js";

const CRICAPI_MATCH_ID = process.argv[2] ?? "3dd82a3e-52e3-409b-bb9c-ef458942a7a2";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const section = (t) => console.log("\n" + "=".repeat(70) + "\n" + t + "\n" + "=".repeat(70));

section(`1. Is ${CRICAPI_MATCH_ID} in matches table?`);
const { data: matchByCric } = await supabase
  .from("matches")
  .select("*")
  .eq("cricapi_match_id", CRICAPI_MATCH_ID);
console.log(matchByCric);

section("2. All matches sorted by match_date desc (last 5)");
const { data: recent } = await supabase
  .from("matches")
  .select("id, name, match_date, cricapi_match_id, synced_at")
  .order("match_date", { ascending: false })
  .limit(5);
for (const m of recent ?? []) console.log(" ", m);

if (matchByCric && matchByCric.length > 0) {
  const internalId = matchByCric[0].id;
  section(`3. Score rows for internal match_id=${internalId}`);
  const { data: scores } = await supabase
    .from("player_match_scores")
    .select("*")
    .eq("match_id", internalId);
  console.log(`  count: ${scores?.length}`);
  for (const s of scores ?? []) console.log(" ", s);
}

section("4. Fetch scorecard from CricAPI");
const apiKey = process.env.CRICAPI_KEY;
if (!apiKey) {
  console.log("  CRICAPI_KEY not set in env");
} else {
  const url = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${CRICAPI_MATCH_ID}`;
  const res = await fetch(url);
  const json = await res.json();
  console.log("  status:", json.status);
  console.log("  info:", json.info);
  if (json.data) {
    console.log("  match:", json.data.name, "| matchEnded:", json.data.matchEnded);
    console.log("  innings count:", json.data.scorecard?.length ?? 0);
    if (json.data.scorecard) {
      for (const [i, inn] of json.data.scorecard.entries()) {
        console.log(`  innings ${i}: batting=${inn.batting?.length ?? 0} bowling=${inn.bowling?.length ?? 0}`);
      }
    }
  }
}

section("5. Series info — does this match appear in series matchList?");
const seriesId = process.env.IPL_SERIES_ID;
console.log("  IPL_SERIES_ID:", seriesId);
if (seriesId && apiKey) {
  const url = `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${seriesId}`;
  const res = await fetch(url);
  const json = await res.json();
  console.log("  status:", json.status);
  const list = json.data?.matchList ?? [];
  console.log(`  total matches in series: ${list.length}`);
  const found = list.find((m) => m.id === CRICAPI_MATCH_ID);
  if (found) {
    console.log("  ✓ FOUND in series:", JSON.stringify(found, null, 2));
  } else {
    console.log("  ✗ NOT FOUND in series matchList");
    console.log("  Last 3 matches in series:");
    for (const m of list.slice(-3)) {
      console.log(`    id=${m.id} name="${m.name}" ended=${m.matchEnded} date=${m.dateTimeGMT}`);
    }
  }
}
