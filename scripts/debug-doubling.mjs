// One-off debugging script — phase 2.
// Run with: node --env-file=.env.local scripts/debug-doubling.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const section = (t) => console.log("\n" + "=".repeat(70) + "\n" + t + "\n" + "=".repeat(70));

// Use range to bypass any default limit
async function fetchAll(table, columns) {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

section("1. Sample 5 player rows (raw)");
const players = await fetchAll("players", "*");
console.log(`  total players fetched: ${players.length}`);
console.log("  columns on first row:", Object.keys(players[0] ?? {}));
for (const p of players.slice(0, 5)) console.log(" ", p);

section("2. cricapi_player_id stats");
const withCric = players.filter((p) => p.cricapi_player_id);
const withoutCric = players.filter((p) => !p.cricapi_player_id);
console.log(`  with cricapi_player_id: ${withCric.length}`);
console.log(`  without cricapi_player_id: ${withoutCric.length}`);

section("3. league_id distribution on players");
const byLeague = new Map();
for (const p of players) {
  const k = p.league_id ?? "(null)";
  byLeague.set(k, (byLeague.get(k) ?? 0) + 1);
}
for (const [k, v] of byLeague) console.log(`  league_id=${k}: ${v} players`);

section("4. Sample 5 player_match_scores rows");
const scores = await fetchAll("player_match_scores", "*");
console.log(`  total scores fetched: ${scores.length}`);
for (const s of scores.slice(0, 5)) console.log(" ", s);

section("5. player_id coverage: do scores reference existing players?");
const playerIds = new Set(players.map((p) => p.id));
const orphanScores = scores.filter((s) => !playerIds.has(s.player_id));
console.log(`  scores referencing nonexistent player_id: ${orphanScores.length}`);
if (orphanScores.length > 0) {
  const orphanIds = [...new Set(orphanScores.map((s) => s.player_id))];
  console.log(`  distinct orphan player_ids (first 20): ${orphanIds.slice(0, 20).join(",")}`);
}

section("6. Distinct player_ids in scores vs players table");
const scorePlayerIds = new Set(scores.map((s) => s.player_id));
console.log(`  distinct player_ids in scores: ${scorePlayerIds.size}`);
console.log(`  distinct player ids in players table: ${playerIds.size}`);
const intersection = [...scorePlayerIds].filter((id) => playerIds.has(id));
console.log(`  intersection: ${intersection.length}`);

section("7. Top scorers WITH names (joined properly)");
const playerById = new Map(players.map((p) => [p.id, p]));
const totals = new Map();
for (const s of scores) {
  const cur = totals.get(s.player_id) ?? { points: 0, matches: 0, scoreRows: [] };
  cur.points += Number(s.final_points ?? 0);
  cur.matches += 1;
  cur.scoreRows.push(s);
  totals.set(s.player_id, cur);
}
const top = [...totals.entries()]
  .map(([pid, v]) => {
    const p = playerById.get(pid);
    return { pid, name: p?.name ?? "(orphan)", league: p?.league_id, owner: p?.owner_id, ...v };
  })
  .sort((a, b) => b.points - a.points)
  .slice(0, 15);
for (const t of top) {
  console.log(`  pid=${String(t.pid).padStart(4)} ${String(t.name).padEnd(28)} pts=${String(t.points).padStart(6)} matches=${String(t.matches).padStart(3)} league=${t.league ?? "-"} owner=${t.owner ?? "-"}`);
}

section("8. Pick top scorer — show their per-match breakdown");
const top1 = top[0];
if (top1) {
  const matches = await fetchAll("matches", "id,name,match_date,cricapi_match_id");
  const mById = new Map(matches.map((m) => [m.id, m]));
  console.log(`  Player: ${top1.name} (id=${top1.pid})`);
  for (const s of top1.scoreRows.sort((a, b) => a.match_id - b.match_id)) {
    const m = mById.get(s.match_id);
    console.log(`   match_id=${s.match_id} (${m?.name ?? "?"}) runs=${s.runs} wkts=${s.wickets} raw=${s.raw_points} final=${s.final_points}`);
  }
}

section("9. owner_standings view — independent recompute");
const ownersData = await fetchAll("owners", "*");
const ownerById = new Map(ownersData.map((o) => [o.id, o]));
const ownerTotals = new Map();
for (const [pid, t] of totals) {
  const p = playerById.get(pid);
  if (!p) continue;
  const oid = p.owner_id;
  ownerTotals.set(oid, (ownerTotals.get(oid) ?? 0) + t.points);
}
console.log("  Recomputed (only counting non-orphan scores):");
for (const [oid, pts] of [...ownerTotals.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${ownerById.get(oid)?.name ?? oid}: ${pts}`);
}
console.log("  Stored owner_standings view:");
const { data: standings } = await supabase.from("owner_standings").select("*");
for (const s of standings ?? []) console.log(`   ${s.name}: ${s.total_points}`);
