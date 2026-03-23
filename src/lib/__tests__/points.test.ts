import { describe, it, expect } from "vitest";
import { calculatePoints, PlayerMatchStats, PlayerRole } from "../points";

const NO_ROLE: PlayerRole = { isCaptain: false, isViceCaptain: false };
const CAPTAIN: PlayerRole = { isCaptain: true, isViceCaptain: false };
const VICE_CAPTAIN: PlayerRole = { isCaptain: false, isViceCaptain: true };

function makeStats(overrides: Partial<PlayerMatchStats> = {}): PlayerMatchStats {
  return {
    runs: 0,
    wickets: 0,
    catches: 0,
    sixes: 0,
    isCentury: false,
    isFiveWicket: false,
    isHatTrick: false,
    isSixSixes: false,
    ...overrides,
  };
}

describe("calculatePoints", () => {
  it("returns 0 for zero stats", () => {
    const result = calculatePoints(makeStats(), NO_ROLE);
    expect(result.finalTotal).toBe(0);
    expect(result.rawTotal).toBe(0);
    expect(result.multiplier).toBe(1);
  });

  it("calculates runs correctly", () => {
    const result = calculatePoints(makeStats({ runs: 45 }), NO_ROLE);
    expect(result.runPoints).toBe(45);
    expect(result.finalTotal).toBe(45);
  });

  it("calculates wickets correctly (25 per wicket)", () => {
    const result = calculatePoints(makeStats({ wickets: 3 }), NO_ROLE);
    expect(result.wicketPoints).toBe(75);
    expect(result.finalTotal).toBe(75);
  });

  it("awards century bonus for 100+ runs", () => {
    const result = calculatePoints(
      makeStats({ runs: 100, isCentury: true }),
      NO_ROLE
    );
    expect(result.runPoints).toBe(100);
    expect(result.centuryBonus).toBe(100);
    expect(result.finalTotal).toBe(200);
  });

  it("awards century bonus for exactly 100 runs", () => {
    const result = calculatePoints(
      makeStats({ runs: 100, isCentury: true }),
      NO_ROLE
    );
    expect(result.centuryBonus).toBe(100);
    expect(result.finalTotal).toBe(200);
  });

  it("awards 5-wicket bonus", () => {
    const result = calculatePoints(
      makeStats({ wickets: 5, isFiveWicket: true }),
      NO_ROLE
    );
    expect(result.wicketPoints).toBe(125);
    expect(result.fiveWicketBonus).toBe(100);
    expect(result.finalTotal).toBe(225);
  });

  it("awards hat-trick bonus (200)", () => {
    const result = calculatePoints(
      makeStats({ wickets: 3, isHatTrick: true }),
      NO_ROLE
    );
    expect(result.wicketPoints).toBe(75);
    expect(result.hatTrickBonus).toBe(200);
    expect(result.finalTotal).toBe(275);
  });

  it("awards 6 sixes bonus (300)", () => {
    const result = calculatePoints(
      makeStats({ runs: 60, sixes: 6, isSixSixes: true }),
      NO_ROLE
    );
    expect(result.sixSixesBonus).toBe(300);
    expect(result.finalTotal).toBe(360); // 60 runs + 300 bonus
  });

  it("applies captain 2x multiplier", () => {
    const result = calculatePoints(makeStats({ runs: 50 }), CAPTAIN);
    expect(result.multiplier).toBe(2);
    expect(result.rawTotal).toBe(50);
    expect(result.finalTotal).toBe(100);
  });

  it("applies vice captain 1.5x multiplier", () => {
    const result = calculatePoints(makeStats({ runs: 50 }), VICE_CAPTAIN);
    expect(result.multiplier).toBe(1.5);
    expect(result.rawTotal).toBe(50);
    expect(result.finalTotal).toBe(75);
  });

  it("handles combined scenario: century + 6 sixes as captain", () => {
    const result = calculatePoints(
      makeStats({
        runs: 120,
        sixes: 8,
        isCentury: true,
        isSixSixes: true,
      }),
      CAPTAIN
    );
    // raw: 120 (runs) + 100 (century) + 300 (6 sixes) = 520
    // captain: 520 * 2 = 1040
    expect(result.rawTotal).toBe(520);
    expect(result.finalTotal).toBe(1040);
  });

  it("handles all-rounder scenario: runs + wickets + bonuses", () => {
    const result = calculatePoints(
      makeStats({
        runs: 102,
        wickets: 5,
        sixes: 7,
        isCentury: true,
        isFiveWicket: true,
        isSixSixes: true,
      }),
      NO_ROLE
    );
    // 102 (runs) + 125 (5 wickets) + 100 (century) + 100 (5-wicket) + 300 (6 sixes) = 727
    expect(result.rawTotal).toBe(727);
    expect(result.finalTotal).toBe(727);
  });

  it("captain multiplier applies to all bonuses", () => {
    const result = calculatePoints(
      makeStats({ wickets: 3, isHatTrick: true }),
      CAPTAIN
    );
    // raw: 75 + 200 = 275
    // captain: 275 * 2 = 550
    expect(result.finalTotal).toBe(550);
  });
});
