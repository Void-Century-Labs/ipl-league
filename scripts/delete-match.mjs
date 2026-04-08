// Delete a match and all of its player_match_scores rows.
// Accepts either a cricapi_match_id (UUID) or an internal integer match id.
//
// Usage:
//   node --env-file=.env.local scripts/delete-match.mjs <id>           # dry-run
//   node --env-file=.env.local scripts/delete-match.mjs <id> --apply
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const idArg = process.argv[2];
if (!idArg || idArg.startsWith("--")) {
  console.error("Usage: delete-match.mjs <cricapi_match_id|internal_id> [--apply]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(APPLY ? "MODE: APPLY (will delete)" : "MODE: DRY-RUN\n");

// Resolve to a single match row
const isInteger = /^\d+$/.test(idArg);
const query = supabase.from("matches").select("*");
const { data: matches, error } = isInteger
  ? await query.eq("id", Number(idArg))
  : await query.eq("cricapi_match_id", idArg);
if (error) throw error;
if (!matches || matches.length === 0) {
  console.error(`No match found for ${isInteger ? "id" : "cricapi_match_id"}=${idArg}`);
  process.exit(1);
}

const match = matches[0];
console.log("Match to delete:");
console.log(`  id:               ${match.id}`);
console.log(`  cricapi_match_id: ${match.cricapi_match_id}`);
console.log(`  name:             ${match.name}`);
console.log(`  match_date:       ${match.match_date}`);
console.log(`  status:           ${match.status}`);

// Count score rows
const { data: scores } = await supabase
  .from("player_match_scores")
  .select("id, player_id, final_points")
  .eq("match_id", match.id);
const totalPoints = (scores ?? []).reduce(
  (a, s) => a + Number(s.final_points ?? 0),
  0
);
console.log(`\nplayer_match_scores rows: ${scores?.length ?? 0}`);
console.log(`total final_points being removed: ${totalPoints}`);

if (!APPLY) {
  console.log("\nRe-run with --apply to actually delete.");
  process.exit(0);
}

console.log("\nDeleting score rows...");
const { error: delScoreErr } = await supabase
  .from("player_match_scores")
  .delete()
  .eq("match_id", match.id);
if (delScoreErr) {
  console.error("Failed to delete scores:", delScoreErr);
  process.exit(1);
}
console.log("  done.");

console.log("Deleting match row...");
const { error: delMatchErr } = await supabase
  .from("matches")
  .delete()
  .eq("id", match.id);
if (delMatchErr) {
  console.error("Failed to delete match:", delMatchErr);
  process.exit(1);
}
console.log("  done.");

console.log("\nMatch deleted.");
