import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSeriesInfo, getMatchScorecard } from "@/lib/cricapi";
import { calculatePoints } from "@/lib/points";
import type { ScorecardBatsman, ScorecardBowler } from "@/lib/cricapi";

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return syncMatches();
}

async function syncMatches() {
  const summary: string[] = [];

  try {
    // 1. Get all active seasons (replaces single IPL_SERIES_ID env var)
    const { data: activeSeasons } = await supabaseAdmin
      .from("seasons")
      .select("id, name, cricapi_series_id")
      .eq("is_active", true);

    // Fallback: use IPL_SERIES_ID env var if no active seasons in DB
    const seasons = activeSeasons?.length
      ? activeSeasons
      : process.env.IPL_SERIES_ID
      ? [{ id: null, name: "IPL (env)", cricapi_series_id: process.env.IPL_SERIES_ID }]
      : [];

    if (seasons.length === 0) {
      return NextResponse.json({
        status: "error",
        message: "No active seasons found and IPL_SERIES_ID env var not set",
      });
    }

    for (const season of seasons) {
      if (!season.cricapi_series_id) {
        summary.push(`Skipping season "${season.name}" — no cricapi_series_id`);
        continue;
      }

      summary.push(`Processing season: ${season.name} (series: ${season.cricapi_series_id})`);

      const seriesInfo = await getSeriesInfo(season.cricapi_series_id);
      if (!seriesInfo) {
        summary.push(`  series_info API call failed for ${season.name}`);
        continue;
      }

      const iplMatches = seriesInfo.matchList ?? [];
      summary.push(`  Found ${iplMatches.length} matches in series`);

    // 2. Get already-synced matches. We dedup by BOTH cricapi_match_id and
    // name, because CricAPI sometimes re-issues a new id for the same physical
    // match (observed: same game returned with a different id and a slightly
    // different timestamp on a later sync, which created duplicates).
    const { data: existingMatches } = await supabaseAdmin
      .from("matches")
      .select("cricapi_match_id, name");
    const syncedIds = new Set(
      (existingMatches ?? []).map((m) => m.cricapi_match_id)
    );
    const syncedNames = new Set(
      (existingMatches ?? []).map((m) => m.name).filter(Boolean)
    );

      // 3. Get all league players across all leagues for this season
      const playerQuery = supabaseAdmin
        .from("players")
        .select("id, name, cricapi_player_id, is_captain, is_vice_captain, league_id, league_member_id");

      // If season has an ID in DB, scope to leagues in that season
      if (season.id) {
        const { data: leaguesInSeason } = await supabaseAdmin
          .from("leagues")
          .select("id")
          .eq("season_id", season.id);

        const leagueIds = (leaguesInSeason ?? []).map((l) => l.id);
        if (leagueIds.length > 0) {
          playerQuery.in("league_id", leagueIds);
        }
      }

      const { data: leaguePlayers } = await playerQuery;

      if (!leaguePlayers || leaguePlayers.length === 0) {
        summary.push(`  No league players found for season ${season.name}`);
        continue;
      }

      let matchesSynced = 0;
      let playerScoresAdded = 0;

    for (const match of iplMatches) {
      // Skip already synced and non-completed matches.
      // Dedup on cricapi_match_id AND name — see note above.
      if (syncedIds.has(match.id)) continue;
      if (match.name && syncedNames.has(match.name)) {
        summary.push(`Skipping duplicate (by name): ${match.name}`);
        continue;
      }
      if (!match.matchEnded) continue;

      // Fetch scorecard FIRST with retry. We don't insert the match row until
      // we successfully have a scorecard — otherwise a partial failure leaves
      // an orphaned match row that the dedup would skip forever.
      const scorecard = await fetchScorecardWithRetry(match.id);
      if (!scorecard?.scorecard) {
        summary.push(`No scorecard after retries for: ${match.name} — will retry next run`);
        continue;
      }

      // Build all score rows in memory before touching the DB
      const scoreRows = [];
      for (const player of leaguePlayers) {
        if (!player.cricapi_player_id) continue;

        const stats = extractPlayerStats(
          scorecard.scorecard,
          player.cricapi_player_id
        );
        if (!stats) {
          console.log(`[sync] SKIP ${player.name} (${player.cricapi_player_id}) — not found in scorecard`);
          continue;
        }

          const points = calculatePoints(stats, {
            isCaptain: player.is_captain,
            isViceCaptain: player.is_vice_captain,
          });

          console.log(
            `[sync] ${player.name} | runs=${stats.runs} wkts=${stats.wickets} 6s=${stats.sixes} | raw=${points.rawTotal} final=${points.finalTotal}${player.is_captain ? " (C)" : player.is_vice_captain ? " (VC)" : ""}`
          );

        scoreRows.push({
          player_id: player.id,
          runs: stats.runs,
          wickets: stats.wickets,
          catches: stats.catches,
          sixes: stats.sixes,
          is_century: stats.isCentury,
          is_five_wicket: stats.isFiveWicket,
          is_hat_trick: stats.isHatTrick,
          is_six_sixes: stats.isSixSixes,
          raw_points: points.rawTotal,
          final_points: points.finalTotal,
        });
      }

      // Now (and only now) insert the match row
      const { data: insertedMatch, error: matchError } = await supabaseAdmin
        .from("matches")
        .insert({
          cricapi_match_id: match.id,
          name: match.name,
          match_date: match.dateTimeGMT,
          status: "completed",
          teams: match.teams,
          venue: match.venue,
          result: match.status,
        })
        .select("id")
        .single();

      if (matchError || !insertedMatch) {
        summary.push(`Failed to insert match: ${match.name} (${matchError?.message ?? "unknown"})`);
        continue;
      }
      matchesSynced++;

      if (scoreRows.length === 0) {
        // No league players were in this match — that's a legitimate state
        // (e.g. all-overseas XI playing). Match row stands; nothing to score.
        summary.push(`No league players in: ${match.name}`);
        continue;
      }

      // Bulk upsert all score rows for this match
      const { error: scoreError } = await supabaseAdmin
        .from("player_match_scores")
        .upsert(
          scoreRows.map((r) => ({ ...r, match_id: insertedMatch.id })),
          { onConflict: "player_id,match_id" }
        );

      if (scoreError) {
        // Scoring failed after the match was inserted. Roll back the match row
        // so the next sync run will re-attempt this match cleanly.
        console.error(`[sync] Bulk score upsert failed for ${match.name}:`, scoreError.message);
        await supabaseAdmin.from("matches").delete().eq("id", insertedMatch.id);
        matchesSynced--;
        summary.push(`Score insert failed, rolled back match: ${match.name}`);
        continue;
      }
      playerScoresAdded += scoreRows.length;
    }

      summary.push(
        `  Synced ${matchesSynced} new matches, added ${playerScoresAdded} player scores`
      );
    }

    return NextResponse.json({
      status: "success",
      summary,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { status: "error", message: String(err), summary },
      { status: 500 }
    );
  }
}

// Retry the scorecard fetch a few times before giving up. CricAPI is
// occasionally flaky right after a match ends — a transient null shouldn't
// cause us to skip the match permanently.
async function fetchScorecardWithRetry(matchId: string, attempts = 3) {
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
  for (let i = 0; i < attempts; i++) {
    const result = await getMatchScorecard(matchId);
    if (result?.scorecard && result.scorecard.length > 0) return result;
    if (i < attempts - 1) {
      console.log(`[sync] scorecard attempt ${i + 1}/${attempts} failed for ${matchId}, retrying in ${delays[i]}ms`);
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  return null;
}

function extractPlayerStats(
  scorecardInnings: Array<{
    batting: ScorecardBatsman[];
    bowling: ScorecardBowler[];
  }>,
  cricapiPlayerId: string
) {
  let totalRuns = 0;
  let totalWickets = 0;
  let totalSixes = 0;
  let totalCatches = 0;
  let found = false;

  for (const innings of scorecardInnings) {
    for (const bat of innings.batting) {
      if (bat.batsman.id === cricapiPlayerId) {
        totalRuns += bat.r;
        totalSixes += bat["6s"];
        found = true;
      }
    }

    for (const bowl of innings.bowling) {
      if (bowl.bowler.id === cricapiPlayerId) {
        totalWickets += bowl.w;
        found = true;
      }
    }
  }

  if (!found) return null;

  return {
    runs: totalRuns,
    wickets: totalWickets,
    catches: totalCatches,
    sixes: totalSixes,
    isCentury: totalRuns >= 100,
    isFiveWicket: totalWickets >= 5,
    isHatTrick: false,
    isSixSixes: false,
  };
}
