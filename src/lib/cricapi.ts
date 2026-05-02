const BASE_URL = "https://api.cricapi.com/v1";
const API_KEY = process.env.CRICAPI_KEY!;

interface CricAPIResponse<T> {
  apikey: string;
  data: T;
  status: string;
  reason?: string;
  info?: {
    hitsToday: number;
    hitsLimit: number;
    credits: number;
    server: number;
    offsetRows: number;
    totalRows: number;
    queryTime: number;
  };
}

export interface CricAPIMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  score: Array<{
    r: number;
    w: number;
    o: number;
    inning: string;
  }>;
  series_id: string;
  fantasyEnabled: boolean;
  bbbEnabled: boolean;
  hasSquad: boolean;
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface ScorecardBatsman {
  batsman: { id: string; name: string };
  r: number;
  b: number;
  "4s": number;
  "6s": number;
  sr: number;
  dismissal: string;
}

export interface ScorecardBowler {
  bowler: { id: string; name: string };
  o: number;
  m: number;
  r: number;
  w: number;
  eco: number;
}

export interface CricAPIScorecard {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  teams: string[];
  scorecard: Array<{
    batting: ScorecardBatsman[];
    bowling: ScorecardBowler[];
  }>;
}

export type CricAPIResult<T> =
  | { ok: true; data: T }
  | { ok: false; transient: boolean; reason: string };

async function fetchAPI<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<CricAPIResult<T>> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("apikey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const reason = `HTTP ${res.status}`;
      console.error(`CricAPI ${endpoint} failed: ${reason}`);
      return { ok: false, transient: res.status >= 500, reason };
    }
    const json: CricAPIResponse<T> = await res.json();

    if (json.status !== "success") {
      const reason = json.reason ?? json.status;
      console.error(
        `CricAPI ${endpoint} returned status: ${json.status}${json.reason ? ` — ${json.reason}` : ""}`
      );
      // CricAPI status:"failure" is never recoverable within seconds —
      // "not found" is permanent, "Blocked for 15 minutes" outlasts our backoff.
      return { ok: false, transient: false, reason };
    }

    if (json.info) {
      console.log(
        `CricAPI ${endpoint}: ${json.info.hitsToday}/${json.info.hitsLimit} hits used today`
      );
    }

    return { ok: true, data: json.data };
  } catch (err) {
    console.error(`CricAPI ${endpoint} error:`, err);
    return { ok: false, transient: true, reason: String(err) };
  }
}

export interface CricAPISeries {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  odi: number;
  t20: number;
  test: number;
  squads: number;
  matches: number;
}

export interface CricAPISeriesInfo {
  info: CricAPISeries;
  matchList: CricAPIMatch[];
}

export async function listSeries(search: string): Promise<CricAPISeries[]> {
  const result = await fetchAPI<CricAPISeries[]>("series", { search });
  return result.ok ? result.data : [];
}

export async function getSeriesInfo(
  seriesId: string
): Promise<CricAPISeriesInfo | null> {
  const result = await fetchAPI<CricAPISeriesInfo>("series_info", { id: seriesId });
  return result.ok ? result.data : null;
}

export async function getCurrentMatches(): Promise<CricAPIMatch[]> {
  const result = await fetchAPI<CricAPIMatch[]>("currentMatches");
  return result.ok ? result.data : [];
}

export async function getMatchScorecard(
  matchId: string
): Promise<CricAPIResult<CricAPIScorecard>> {
  return fetchAPI<CricAPIScorecard>("match_scorecard", { id: matchId });
}

export async function searchPlayer(
  name: string
): Promise<{ id: string; name: string; country: string }[]> {
  const result = await fetchAPI<{ id: string; name: string; country: string }[]>(
    "players",
    { search: name }
  );
  return result.ok ? result.data : [];
}
