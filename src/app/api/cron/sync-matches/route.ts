import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSeriesMatches, getMatchScorecard } from "@/lib/cricbuzz";
import type { CricbuzzMatch } from "@/lib/cricbuzz";
import { buildScoreRows, type LeaguePlayer } from "@/lib/match-stats";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return syncMatches();
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function syncMatches() {
  const summary: string[] = [];

  try {
    const seriesId = process.env.CRICBUZZ_SERIES_ID;
    if (!seriesId) {
      return NextResponse.json({
        status: "error",
        message: "CRICBUZZ_SERIES_ID env var not set",
      });
    }
    summary.push(`Using Cricbuzz seriesId: ${seriesId}`);

    const seriesResult = await getSeriesMatches(seriesId);
    if (!seriesResult.ok) {
      return NextResponse.json({
        status: "error",
        message: `Series fetch failed: ${seriesResult.reason}`,
        summary,
      });
    }
    const allMatches = seriesResult.data;
    const ended = allMatches.filter(
      (m) => (m.state ?? "").toLowerCase() === "complete"
    );
    summary.push(`Found ${allMatches.length} matches, ${ended.length} ended`);

    const { data: existingMatches } = await supabaseAdmin
      .from("matches")
      .select("id, name, match_date, teams");

    const { data: leaguePlayers } = await supabaseAdmin
      .from("players")
      .select("id, name, is_captain, is_vice_captain");

    if (!leaguePlayers) {
      return NextResponse.json({
        status: "error",
        message: "Failed to fetch league players",
      });
    }

    // Dedup by (date_day, both teams substring-match) — Cricbuzz match IDs and
    // names differ from the CricAPI ones in the existing rows, so we can't
    // dedup on either; date+teams is the stable physical-match key.
    function isAlreadySynced(cb: CricbuzzMatch): boolean {
      const cbDay = new Date(Number(cb.startDate ?? 0))
        .toISOString()
        .slice(0, 10);
      const cbTeams = [cb.team1?.teamName, cb.team2?.teamName]
        .map(norm)
        .filter(Boolean);
      return (existingMatches ?? []).some(
        (ex: { match_date?: string | null; teams?: string[] | null }) => {
          const exDay = (ex.match_date ?? "").slice(0, 10);
          if (exDay !== cbDay) return false;
          const exTeams = (ex.teams ?? []).map(norm);
          return cbTeams.every((cbT) =>
            exTeams.some((exT) => exT.includes(cbT) || cbT.includes(exT))
          );
        }
      );
    }

    let matchesSynced = 0;
    let playerScoresAdded = 0;

    for (const match of ended) {
      if (isAlreadySynced(match)) continue;

      const label = `${match.team1?.teamSName} vs ${match.team2?.teamSName}`;

      const scardResult = await getMatchScorecard(match.matchId);
      if (!scardResult.ok) {
        const tag = scardResult.transient ? "transient" : "permanent";
        summary.push(
          `Scorecard ${tag} failure for ${label}: ${scardResult.reason}`
        );
        continue;
      }
      const scard = scardResult.data;
      if (!scard.scorecard?.length) {
        summary.push(`No innings for ${label} — skipping`);
        continue;
      }

      const { rows: scoreRows, unmatched } = buildScoreRows(
        scard,
        leaguePlayers as LeaguePlayer[]
      );
      if (unmatched.length > 0) {
        console.log(`[sync] unmatched in ${label}:`, unmatched.join(", "));
      }

      const matchDateIso = new Date(
        Number(match.startDate ?? 0)
      ).toISOString();
      const matchName = `${match.team1?.teamName} vs ${match.team2?.teamName}, ${match.matchDesc}, Indian Premier League 2026`;
      const venue = [match.venueInfo?.ground, match.venueInfo?.city]
        .filter(Boolean)
        .join(", ");

      const { data: insertedMatch, error: matchError } = await supabaseAdmin
        .from("matches")
        .insert({
          cricapi_match_id: null,
          name: matchName,
          match_date: matchDateIso,
          status: "completed",
          teams: [match.team1?.teamName, match.team2?.teamName].filter(Boolean),
          venue,
          result: match.status,
        })
        .select("id")
        .single();

      if (matchError || !insertedMatch) {
        summary.push(
          `Failed to insert match: ${matchName} (${matchError?.message ?? "unknown"})`
        );
        continue;
      }
      matchesSynced++;

      if (scoreRows.length === 0) {
        summary.push(`No league players in: ${matchName}`);
        continue;
      }

      const { error: scoreError } = await supabaseAdmin
        .from("player_match_scores")
        .upsert(
          scoreRows.map((r) => ({ ...r, match_id: insertedMatch.id })),
          { onConflict: "player_id,match_id" }
        );

      if (scoreError) {
        // Rollback: delete the match row so the next run retries cleanly.
        console.error(
          `[sync] Score upsert failed for ${matchName}:`,
          scoreError.message
        );
        await supabaseAdmin
          .from("matches")
          .delete()
          .eq("id", insertedMatch.id);
        matchesSynced--;
        summary.push(`Score insert failed, rolled back: ${matchName}`);
        continue;
      }
      playerScoresAdded += scoreRows.length;

      console.log(
        `[sync] ${matchName}: inserted ${scoreRows.length} score rows`
      );
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
