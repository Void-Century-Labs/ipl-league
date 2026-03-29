const BASE_URL = "https://api.cricapi.com/v1";
const API_KEY = process.env.CRICAPI_KEY!;

interface CricAPIResponse<T> {
  apikey: string;
  data: T;
  status: string;
  info: {
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

async function fetchAPI<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("apikey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error(`CricAPI ${endpoint} failed: ${res.status}`);
      return null;
    }
    const json: CricAPIResponse<T> = await res.json();

    console.log(
      `CricAPI ${endpoint}: ${json.info.hitsToday}/${json.info.hitsLimit} hits used today`
    );

    if (json.status !== "success") {
      console.error(`CricAPI ${endpoint} returned status: ${json.status}`);
      return null;
    }

    return json.data;
  } catch (err) {
    console.error(`CricAPI ${endpoint} error:`, err);
    return null;
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
  const data = await fetchAPI<CricAPISeries[]>("series", { search });
  return data ?? [];
}

export async function getSeriesInfo(
  seriesId: string
): Promise<CricAPISeriesInfo | null> {
  return fetchAPI<CricAPISeriesInfo>("series_info", { id: seriesId });
}

export async function getCurrentMatches(): Promise<CricAPIMatch[]> {
  const data = await fetchAPI<CricAPIMatch[]>("currentMatches");
  return data ?? [];
}

export async function getMatchScorecard(
  matchId: string
): Promise<CricAPIScorecard | null> {
  return fetchAPI<CricAPIScorecard>("match_scorecard", { id: matchId });
}

export async function searchPlayer(
  name: string
): Promise<{ id: string; name: string; country: string }[]> {
  const data = await fetchAPI<{ id: string; name: string; country: string }[]>(
    "players",
    { search: name }
  );
  return data ?? [];
}
