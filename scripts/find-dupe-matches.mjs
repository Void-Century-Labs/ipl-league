// Find matches that are semantically duplicates (same real-world game)
// despite having distinct cricapi_match_id values.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: matches } = await supabase
  .from("matches")
  .select("id, cricapi_match_id, name, match_date, teams, status, synced_at")
  .order("match_date", { ascending: true });

console.log(`Total matches: ${matches.length}\n`);

// Group by name
const byName = new Map();
for (const m of matches) {
  if (!byName.has(m.name)) byName.set(m.name, []);
  byName.get(m.name).push(m);
}
const dupes = [...byName.entries()].filter(([, v]) => v.length > 1);
console.log(`Names appearing more than once: ${dupes.length}\n`);
for (const [name, rows] of dupes) {
  console.log("─".repeat(70));
  console.log(name);
  for (const r of rows) {
    console.log(
      `  id=${r.id} cricapi=${r.cricapi_match_id} date=${r.match_date} synced=${r.synced_at}`
    );
  }
}

// Also group by (teams, date) in case names differ but it's the same game
console.log("\n\nGrouped by (teams, date):");
const byTeamsDate = new Map();
for (const m of matches) {
  const k = JSON.stringify({ t: [...(m.teams ?? [])].sort(), d: m.match_date });
  if (!byTeamsDate.has(k)) byTeamsDate.set(k, []);
  byTeamsDate.get(k).push(m);
}
const dupesB = [...byTeamsDate.entries()].filter(([, v]) => v.length > 1);
console.log(`(teams,date) duplicates: ${dupesB.length}`);
for (const [k, rows] of dupesB) {
  console.log("─".repeat(70));
  console.log(k);
  for (const r of rows) {
    console.log(`  id=${r.id} cricapi=${r.cricapi_match_id} name="${r.name}"`);
  }
}
