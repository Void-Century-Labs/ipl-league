export interface PlayerMatchStats {
  runs: number;
  wickets: number;
  catches: number;
  sixes: number;
  isCentury: boolean;
  isFiveWicket: boolean;
  isHatTrick: boolean;
  isSixSixes: boolean;
}

export interface PlayerRole {
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface PointsBreakdown {
  runPoints: number;
  wicketPoints: number;
  centuryBonus: number;
  fiveWicketBonus: number;
  hatTrickBonus: number;
  sixSixesBonus: number;
  rawTotal: number;
  multiplier: number;
  finalTotal: number;
}

export function calculatePoints(
  stats: PlayerMatchStats,
  role: PlayerRole
): PointsBreakdown {
  const runPoints = stats.runs;
  const wicketPoints = stats.wickets * 25;
  const centuryBonus = stats.isCentury ? 100 : 0;
  const fiveWicketBonus = stats.isFiveWicket ? 100 : 0;
  const hatTrickBonus = stats.isHatTrick ? 200 : 0;
  const sixSixesBonus = stats.isSixSixes ? 300 : 0;

  const rawTotal =
    runPoints +
    wicketPoints +
    centuryBonus +
    fiveWicketBonus +
    hatTrickBonus +
    sixSixesBonus;

  const multiplier = role.isCaptain ? 2 : role.isViceCaptain ? 1.5 : 1;
  const finalTotal = rawTotal * multiplier;

  return {
    runPoints,
    wicketPoints,
    centuryBonus,
    fiveWicketBonus,
    hatTrickBonus,
    sixSixesBonus,
    rawTotal,
    multiplier,
    finalTotal,
  };
}
