import type { CricbuzzScorecard } from "./cricbuzz";
import { calculatePoints } from "./points";

export interface LeaguePlayer {
  id: number;
  name: string;
  is_captain: boolean | null;
  is_vice_captain: boolean | null;
}

export interface ScoreRow {
  player_id: number;
  runs: number;
  wickets: number;
  catches: number;
  sixes: number;
  is_century: boolean;
  is_five_wicket: boolean;
  is_hat_trick: boolean;
  is_six_sixes: boolean;
  raw_points: number;
  final_points: number;
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildScoreRows(
  scorecard: CricbuzzScorecard,
  players: LeaguePlayer[]
): { rows: ScoreRow[]; unmatched: string[] } {
  const innings = scorecard.scorecard ?? [];
  if (innings.length === 0) return { rows: [], unmatched: [] };

  const stats: Record<
    string,
    { displayName: string; runs: number; wickets: number; sixes: number }
  > = {};
  const ensure = (rawName: string) => {
    const key = norm(rawName);
    return (stats[key] ??= {
      displayName: rawName,
      runs: 0,
      wickets: 0,
      sixes: 0,
    });
  };

  for (const inn of innings) {
    for (const b of inn.batsman ?? []) {
      if (!b.name) continue;
      const s = ensure(b.name);
      s.runs += b.runs ?? 0;
      s.sixes += b.sixes ?? 0;
    }
    for (const w of inn.bowler ?? []) {
      if (!w.name) continue;
      const s = ensure(w.name);
      s.wickets += w.wickets ?? 0;
    }
  }

  const playerByName: Record<string, LeaguePlayer> = {};
  for (const p of players) playerByName[norm(p.name)] = p;

  const rows: ScoreRow[] = [];
  const unmatched: string[] = [];

  for (const [normName, agg] of Object.entries(stats)) {
    const player = playerByName[normName];
    if (!player) {
      unmatched.push(agg.displayName);
      continue;
    }
    const isCentury = agg.runs >= 100;
    const isFiveWicket = agg.wickets >= 5;
    const points = calculatePoints(
      {
        runs: agg.runs,
        wickets: agg.wickets,
        catches: 0,
        sixes: agg.sixes,
        isCentury,
        isFiveWicket,
        isHatTrick: false,
        isSixSixes: false,
      },
      {
        isCaptain: !!player.is_captain,
        isViceCaptain: !!player.is_vice_captain,
      }
    );
    rows.push({
      player_id: player.id,
      runs: agg.runs,
      wickets: agg.wickets,
      catches: 0,
      sixes: agg.sixes,
      is_century: isCentury,
      is_five_wicket: isFiveWicket,
      is_hat_trick: false,
      is_six_sixes: false,
      raw_points: points.rawTotal,
      final_points: points.finalTotal,
    });
  }

  return { rows, unmatched };
}
