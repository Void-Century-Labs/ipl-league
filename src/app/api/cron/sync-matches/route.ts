import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getCurrentMatches, getMatchScorecard } from "@/lib/cricapi";
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
    // 1. Fetch current matches from CricAPI
    const matches = await getCurrentMatches();
    const iplMatches = matches.filter(
      (m) =>
        m.name.toLowerCase().includes("ipl") ||
        m.name.toLowerCase().includes("indian premier league")
    );

    summary.push(`Found ${iplMatches.length} IPL matches from API`);

    // 2. Get already-synced match IDs
    const { data: existingMatches } = await supabaseAdmin
      .from("matches")
      .select("cricapi_match_id");
    const syncedIds = new Set(
      (existingMatches ?? []).map((m) => m.cricapi_match_id)
    );

    // 3. Get our league players for matching
    const { data: leaguePlayers } = await supabaseAdmin
      .from("players")
      .select("id, name, cricapi_player_id, is_captain, is_vice_captain");

    if (!leaguePlayers) {
      return NextResponse.json({
        status: "error",
        message: "Failed to fetch league players",
      });
    }

    let matchesSynced = 0;
    let playerScoresAdded = 0;

    for (const match of iplMatches) {
      // Skip already synced and non-completed matches
      if (syncedIds.has(match.id)) continue;
      if (!match.matchEnded) continue;

      // Insert match
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
        summary.push(`Failed to insert match: ${match.name}`);
        continue;
      }

      matchesSynced++;

      // Fetch scorecard
      const scorecard = await getMatchScorecard(match.id);
      if (!scorecard?.scorecard) {
        summary.push(`No scorecard for: ${match.name}`);
        continue;
      }

      // Process each player in our league
      for (const player of leaguePlayers) {
        if (!player.cricapi_player_id) continue;

        const stats = extractPlayerStats(
          scorecard.scorecard,
          player.cricapi_player_id
        );
        if (!stats) continue;

        const points = calculatePoints(stats, {
          isCaptain: player.is_captain,
          isViceCaptain: player.is_vice_captain,
        });

        const { error: scoreError } = await supabaseAdmin
          .from("player_match_scores")
          .upsert(
            {
              player_id: player.id,
              match_id: insertedMatch.id,
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
            },
            { onConflict: "player_id,match_id" }
          );

        if (!scoreError) playerScoresAdded++;
      }
    }

    summary.push(
      `Synced ${matchesSynced} new matches, added ${playerScoresAdded} player scores`
    );

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
    // Check batting
    for (const bat of innings.batting) {
      if (bat.batsman.id === cricapiPlayerId) {
        totalRuns += bat.r;
        totalSixes += bat["6s"];
        found = true;
      }
    }

    // Check bowling
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
    isHatTrick: false, // CricAPI doesn't directly provide hat-trick info; needs manual check
    isSixSixes: totalSixes >= 6,
  };
}
