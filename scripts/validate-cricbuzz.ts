// Validate the RapidAPI Cricbuzz Cricket API for IPL coverage and scorecard quality.
//
// Goal: before committing to migrate off CricAPI, verify that
//   1. the IPL 2026 series is reachable,
//   2. its matchList doesn't contain zombie IDs (scorecard 404s for ended matches),
//   3. scorecards return per-player batting and bowling stats matching what
//      our points calc needs (runs, sixes, wickets — and ideally fours, balls,
//      strike rate, overs).
//
// Usage:
//   RAPIDAPI_KEY=xxx npx tsx scripts/validate-cricbuzz.ts --search "Indian Premier League"
//   RAPIDAPI_KEY=xxx npx tsx scripts/validate-cricbuzz.ts <seriesId>
//
// The script also prints raw top-level keys at each step so you can eyeball
// the response shapes (the documented shape is sometimes wrong/stale).

const HOST = "cricbuzz-cricket.p.rapidapi.com";
const SAMPLE_LIMIT = 3;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
if (!RAPIDAPI_KEY) {
  console.error("RAPIDAPI_KEY env var required");
  process.exit(1);
}

const headers: Record<string, string> = {
  "X-RapidAPI-Host": HOST,
  "X-RapidAPI-Key": RAPIDAPI_KEY,
};

const section = (t: string) =>
  console.log("\n" + "=".repeat(70) + "\n" + t + "\n" + "=".repeat(70));

let totalCalls = 0;

async function call<T = unknown>(path: string): Promise<T> {
  totalCalls++;
  const url = `https://${HOST}${path}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

const topKeys = (obj: unknown) =>
  obj && typeof obj === "object" ? Object.keys(obj as object).join(", ") : String(obj);

async function main() {
// ---------- 1. Resolve series ID ----------

const args = process.argv.slice(2);
const searchIdx = args.indexOf("--search");
let seriesId: string;

if (searchIdx >= 0) {
  const query = args[searchIdx + 1] ?? "Indian Premier League";
  section(`1. Searching league series for "${query}"`);
  const list = await call<{ seriesMapProto?: Array<{ date?: string; series?: Array<{ id: number; name: string; startDt?: string }> }> }>(
    "/series/v1/league"
  );
  console.log(`  top keys: ${topKeys(list)}`);
  const allSeries = (list.seriesMapProto ?? []).flatMap((g) => g.series ?? []);
  const found = allSeries.filter((s) =>
    s.name?.toLowerCase().includes(query.toLowerCase())
  );
  if (found.length === 0) {
    console.log("  no matches. Sample of returned series:");
    for (const s of allSeries.slice(0, 10)) console.log(`    id=${s.id} ${s.name}`);
    process.exit(2);
  }
  for (const s of found) {
    console.log(`  id=${s.id}  ${s.name}  start=${s.startDt ?? "?"}`);
  }
  seriesId = String(found[0].id);
  console.log(`\n  → using seriesId=${seriesId}`);
} else if (args[0] && !args[0].startsWith("--")) {
  seriesId = args[0];
  section(`1. Using seriesId=${seriesId}`);
} else {
  console.error('Pass <seriesId> or --search "<term>"');
  process.exit(1);
}

// ---------- 2. Series matches ----------

section(`2. Fetching /series/v1/${seriesId}`);
const seriesData = await call<{
  matchDetails?: Array<{
    matchDetailsMap?: { key?: string; match?: Array<{ matchInfo?: MatchInfo }> };
  }>;
}>(`/series/v1/${seriesId}`);

interface MatchInfo {
  matchId: number;
  seriesId?: number;
  matchDesc?: string;
  matchFormat?: string;
  startDate?: string;
  endDate?: string;
  state?: string;
  status?: string;
  team1?: { teamId?: number; teamName?: string; teamSName?: string };
  team2?: { teamId?: number; teamName?: string; teamSName?: string };
  venueInfo?: { ground?: string; city?: string };
}

console.log(`  top keys: ${topKeys(seriesData)}`);
const allMatches: MatchInfo[] = (seriesData.matchDetails ?? []).flatMap(
  (d) => (d.matchDetailsMap?.match ?? []).map((m) => m.matchInfo).filter((x): x is MatchInfo => !!x)
);
console.log(`  date groups: ${seriesData.matchDetails?.length ?? 0}`);
console.log(`  total matches in series: ${allMatches.length}`);

if (allMatches.length === 0) {
  console.log("  ✗ no matches parsed — schema may differ. Raw response sample:");
  console.log(JSON.stringify(seriesData, null, 2).slice(0, 1500));
  process.exit(3);
}

const ended = allMatches.filter(
  (m) => (m.state ?? "").toLowerCase() === "complete"
);
console.log(`  ended (state=Complete): ${ended.length}`);
console.log(`  states seen: ${[...new Set(allMatches.map((m) => m.state))].join(", ")}`);

if (ended.length === 0) {
  console.log("  ✗ no ended matches — sample first match:");
  console.log(JSON.stringify(allMatches[0], null, 2));
  process.exit(4);
}

console.log("\n  Sample ended matches:");
for (const m of ended.slice(0, 5)) {
  const t1 = m.team1?.teamSName ?? "?";
  const t2 = m.team2?.teamSName ?? "?";
  console.log(`    matchId=${m.matchId}  ${t1} vs ${t2}  status="${m.status?.slice(0, 60) ?? ""}"`);
}

// ---------- 3. Scorecards for sample ----------

section(`3. Fetching scorecards for ${SAMPLE_LIMIT} ended matches`);

interface Batter {
  id?: number;
  name?: string;
  runs?: number;
  fours?: number;
  sixes?: number;
  balls?: number;
  strkrate?: string;
  outdec?: string;
  iscaptain?: boolean;
  iskeeper?: boolean;
}
interface Bowler {
  id?: number;
  name?: string;
  overs?: number | string;
  maidens?: number;
  runs?: number;
  wickets?: number;
  economy?: number | string;
}
interface Innings {
  inningsid?: number;
  batsman?: Batter[];
  bowler?: Bowler[];
  // Cricbuzz also typically returns: extras, fow, partnership totals, etc.
  [key: string]: unknown;
}
interface Scorecard {
  scorecard?: Innings[];
  ismatchcomplete?: boolean;
  status?: string;
}

let okCount = 0;
let zombieCount = 0;
const sample = ended.slice(0, SAMPLE_LIMIT);

for (const m of sample) {
  console.log(`\n  matchId=${m.matchId} (${m.team1?.teamSName} vs ${m.team2?.teamSName})`);
  try {
    const scard = await call<Scorecard>(`/mcenter/v1/${m.matchId}/scard`);
    console.log(`    top keys: ${topKeys(scard)}  complete=${scard.ismatchcomplete}`);
    const innings = scard.scorecard ?? [];
    console.log(`    innings count: ${innings.length}`);
    if (innings.length === 0) {
      console.log("    ✗ no innings — possible zombie. Raw sample:");
      console.log(JSON.stringify(scard, null, 2).slice(0, 800));
      zombieCount++;
      continue;
    }
    for (const [i, inn] of innings.entries()) {
      const innKeys = Object.keys(inn).join(", ");
      const batters = inn.batsman ?? [];
      const bowlers = inn.bowler ?? [];
      console.log(`    innings ${i} (id=${inn.inningsid}): keys=[${innKeys}]`);
      console.log(`      batters=${batters.length} bowlers=${bowlers.length}`);
      const b = batters[0];
      const w = bowlers[0];
      if (b) {
        console.log(
          `      batter[0]: id=${b.id} name="${b.name}" runs=${b.runs} 4s=${b.fours} 6s=${b.sixes} balls=${b.balls} sr=${b.strkrate} out="${b.outdec}"`
        );
      }
      if (w) {
        console.log(
          `      bowler[0]: id=${w.id} name="${w.name}" overs=${w.overs} runs=${w.runs} wkts=${w.wickets} econ=${w.economy}`
        );
      } else {
        console.log(`      ⚠ no 'bowler' array — innings keys above show what's available`);
      }
    }
    okCount++;
  } catch (e) {
    console.log(`    ✗ ${(e as Error).message}`);
    zombieCount++;
  }
}

// ---------- 4. Summary ----------

section("4. Summary");
console.log(`  total RapidAPI calls: ${totalCalls}`);
console.log(`  scorecards OK: ${okCount}/${sample.length}`);
console.log(`  scorecards zombie/error: ${zombieCount}/${sample.length}`);
console.log(`  ended matches in series: ${ended.length}`);
console.log(
  "\n  Decision: if OK == sample size and per-player fields above look right,"
);
console.log(
  "  this provider is viable. Otherwise inspect the raw response shapes printed above."
);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
