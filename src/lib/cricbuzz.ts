const HOST = "cricbuzz-cricket.p.rapidapi.com";
const BASE_URL = `https://${HOST}`;
const API_KEY = process.env.RAPIDAPI_KEY!;

export type CricbuzzResult<T> =
  | { ok: true; data: T }
  | { ok: false; transient: boolean; reason: string };

interface CricbuzzTeam {
  teamId?: number;
  teamName?: string;
  teamSName?: string;
}

export interface CricbuzzMatch {
  matchId: number;
  matchDesc?: string;
  matchFormat?: string;
  startDate?: string;
  endDate?: string;
  state?: string;
  status?: string;
  team1?: CricbuzzTeam;
  team2?: CricbuzzTeam;
  venueInfo?: { ground?: string; city?: string };
}

export interface ScorecardBatter {
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

export interface ScorecardBowler {
  id?: number;
  name?: string;
  overs?: number | string;
  maidens?: number;
  runs?: number;
  wickets?: number;
  economy?: number | string;
}

export interface ScorecardInnings {
  inningsid?: number;
  batsman?: ScorecardBatter[];
  bowler?: ScorecardBowler[];
  batteamname?: string;
  batteamsname?: string;
  score?: number;
  wickets?: number;
  overs?: number | string;
}

export interface CricbuzzScorecard {
  scorecard?: ScorecardInnings[];
  ismatchcomplete?: boolean;
  status?: string;
}

async function fetchAPI<T>(path: string): Promise<CricbuzzResult<T>> {
  if (!API_KEY) {
    return { ok: false, transient: false, reason: "RAPIDAPI_KEY not set" };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-RapidAPI-Host": HOST, "X-RapidAPI-Key": API_KEY },
      cache: "no-store",
    });
    if (!res.ok) {
      const reason = `HTTP ${res.status}`;
      console.error(`Cricbuzz ${path} failed: ${reason}`);
      return {
        ok: false,
        transient: res.status >= 500 || res.status === 429,
        reason,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    console.error(`Cricbuzz ${path} error:`, err);
    return { ok: false, transient: true, reason: String(err) };
  }
}

export async function getSeriesMatches(
  seriesId: string
): Promise<CricbuzzResult<CricbuzzMatch[]>> {
  const result = await fetchAPI<{
    matchDetails?: Array<{
      matchDetailsMap?: { match?: Array<{ matchInfo?: CricbuzzMatch }> };
    }>;
  }>(`/series/v1/${seriesId}`);
  if (!result.ok) return result;
  const matches = (result.data.matchDetails ?? []).flatMap((d) =>
    (d.matchDetailsMap?.match ?? [])
      .map((m) => m.matchInfo)
      .filter((x): x is CricbuzzMatch => !!x)
  );
  return { ok: true, data: matches };
}

export async function getMatchScorecard(
  matchId: number | string
): Promise<CricbuzzResult<CricbuzzScorecard>> {
  return fetchAPI<CricbuzzScorecard>(`/mcenter/v1/${matchId}/scard`);
}
