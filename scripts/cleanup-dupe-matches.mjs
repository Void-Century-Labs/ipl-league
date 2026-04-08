// Delete duplicate matches and their player_match_scores rows.
// For each group of matches sharing the same `name`, keep the one with the
// EARLIEST synced_at (original sync) and delete the rest.
//
// Usage:
//   node --env-file=.env.local scripts/cleanup-dupe-matches.mjs           # dry-run
//   node --env-file=.env.local scripts/cleanup-dupe-matches.mjs --apply   # actually delete
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(APPLY ? "MODE: APPLY (will delete rows)" : "MODE: DRY-RUN (no deletes)\n");

const { data: matches, error } = await supabase
  .from("matches")
  .select("id, name, synced_at, match_date, cricapi_match_id")
  .order("synced_at", { ascending: true });
if (error) throw error;

const byName = new Map();
for (const m of matches) {
  if (!byName.has(m.name)) byName.set(m.name, []);
  byName.get(m.name).push(m);
}

const toDelete = [];
const toKeep = [];
for (const [name, rows] of byName) {
  if (rows.length === 1) {
    toKeep.push(rows[0]);
    continue;
  }
  // Keep the earliest synced_at (rows is already ordered by synced_at asc)
  const [keep, ...deletes] = rows;
  toKeep.push(keep);
  toDelete.push(...deletes);
}

console.log(`Total matches: ${matches.length}`);
console.log(`Distinct names: ${byName.size}`);
console.log(`Will keep: ${toKeep.length}`);
console.log(`Will delete: ${toDelete.length}\n`);

if (toDelete.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

// Show what will be deleted
console.log("Matches to delete:");
for (const m of toDelete) {
  console.log(`  id=${m.id} synced=${m.synced_at} name="${m.name}"`);
}

// Count score rows that will be deleted
const deleteIds = toDelete.map((m) => m.id);
const { data: scoresToDelete, error: scoresErr } = await supabase
  .from("player_match_scores")
  .select("id, player_id, match_id, final_points")
  .in("match_id", deleteIds);
if (scoresErr) throw scoresErr;
const totalPointsRemoved = scoresToDelete.reduce(
  (a, s) => a + Number(s.final_points ?? 0),
  0
);
console.log(
  `\nplayer_match_scores rows that will be deleted: ${scoresToDelete.length}`
);
console.log(`Total final_points being removed: ${totalPointsRemoved}`);

if (!APPLY) {
  console.log("\nRe-run with --apply to actually delete.");
  process.exit(0);
}

console.log("\nDeleting score rows...");
const { error: delScoreErr } = await supabase
  .from("player_match_scores")
  .delete()
  .in("match_id", deleteIds);
if (delScoreErr) throw delScoreErr;
console.log("  done.");

console.log("Deleting match rows...");
const { error: delMatchErr } = await supabase
  .from("matches")
  .delete()
  .in("id", deleteIds);
if (delMatchErr) throw delMatchErr;
console.log("  done.");

console.log("\nCleanup complete.");
