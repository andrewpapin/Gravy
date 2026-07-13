import { describe, expect, it } from 'vitest';
import {
  ROLL_TO_GOAL_MIN_TARGET,
  ROLL_TO_GOAL_MAX_TARGET,
  getDailyTarget,
  evaluateAttempt,
  pickBestAttempt,
  computeRoundOutcome,
  getRollToGoalPayout,
  rollDice,
} from './rollToGoal';

describe('getDailyTarget', () => {
  it('is stable across repeated calls with the same dateStr', () => {
    const a = getDailyTarget('2026-07-12');
    const b = getDailyTarget('2026-07-12');
    expect(a).toBe(b);
  });

  it('stays within [MIN_TARGET, MAX_TARGET] and varies across dates', () => {
    const targets = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const dateStr = `2026-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`;
      const t = getDailyTarget(dateStr);
      expect(t).toBeGreaterThanOrEqual(ROLL_TO_GOAL_MIN_TARGET);
      expect(t).toBeLessThanOrEqual(ROLL_TO_GOAL_MAX_TARGET);
      targets.add(t);
    }
    expect(targets.size).toBeGreaterThan(1);
  });
});

describe('evaluateAttempt', () => {
  it('busts whenever the total exceeds the target', () => {
    expect(evaluateAttempt([10, 15], 20)).toEqual({ dice: [10, 15], total: 25, bust: true, distance: Infinity });
  });

  it('computes distance-to-target when at or under the target', () => {
    expect(evaluateAttempt([10, 10], 20)).toEqual({ dice: [10, 10], total: 20, bust: false, distance: 0 });
    expect(evaluateAttempt([9, 10], 20)).toEqual({ dice: [9, 10], total: 19, bust: false, distance: 1 });
  });
});

describe('pickBestAttempt', () => {
  it('picks the smallest-distance non-bust attempt among the three', () => {
    const attempts = [
      evaluateAttempt([10, 5], 20), // total 15, distance 5
      evaluateAttempt([10, 8], 20), // total 18, distance 2
      evaluateAttempt([10, 6], 20), // total 16, distance 4
    ];
    expect(pickBestAttempt(attempts)).toEqual(attempts[1]);
  });

  it('ignores busted attempts in favor of any non-bust attempt', () => {
    const attempts = [
      evaluateAttempt([15, 15], 20), // total 30, bust
      evaluateAttempt([10, 5], 20), // total 15, distance 5
      evaluateAttempt([15, 10], 20), // total 25, bust
    ];
    expect(pickBestAttempt(attempts)).toEqual(attempts[1]);
  });

  it('falls back to the first attempt when all three bust', () => {
    const attempts = [
      evaluateAttempt([15, 15], 20),
      evaluateAttempt([16, 16], 20),
      evaluateAttempt([20, 20], 20),
    ];
    expect(pickBestAttempt(attempts)).toEqual(attempts[0]);
  });
});

describe('computeRoundOutcome', () => {
  it('scores an exact match at 500 base', () => {
    const best = evaluateAttempt([10, 10], 20);
    expect(computeRoundOutcome(best)).toEqual({ tier: 'exact', bust: false, distance: 0, displayScore: 500, total: 20 });
  });

  it('scores 1/2/3+ away at 300/150/50 base', () => {
    expect(computeRoundOutcome(evaluateAttempt([9, 10], 20))).toMatchObject({ tier: 'near1', displayScore: 300 });
    expect(computeRoundOutcome(evaluateAttempt([8, 10], 20))).toMatchObject({ tier: 'near2', displayScore: 150 });
    expect(computeRoundOutcome(evaluateAttempt([7, 10], 20))).toMatchObject({ tier: 'far', displayScore: 50 });
    expect(computeRoundOutcome(evaluateAttempt([0, 10], 20))).toMatchObject({ tier: 'far', displayScore: 50 });
  });

  it('reports a bust with 0 displayScore', () => {
    const best = evaluateAttempt([15, 15], 20);
    expect(computeRoundOutcome(best)).toEqual({ tier: 'bust', bust: true, distance: Infinity, displayScore: 0, total: 30 });
  });
});

describe('getRollToGoalPayout', () => {
  it('pays the full gamePts on an exact match', () => {
    expect(getRollToGoalPayout('exact', 20)).toBe(20);
  });

  it('scales payout down by tier', () => {
    expect(getRollToGoalPayout('near1', 20)).toBe(12);
    expect(getRollToGoalPayout('near2', 20)).toBe(6);
    expect(getRollToGoalPayout('far', 20)).toBe(2);
  });

  it('pays 0 on a bust', () => {
    expect(getRollToGoalPayout('bust', 20)).toBe(0);
  });

  it('rounds to the nearest whole point', () => {
    expect(getRollToGoalPayout('far', 15)).toBe(2); // round(1.5) = 2
    expect(getRollToGoalPayout('near2', 15)).toBe(5); // round(4.5) = 5 (banker's-adjacent, Math.round rounds up)
  });
});

describe('rollDice', () => {
  it('produces the requested count of values in [1,6]', () => {
    const dice = rollDice(10);
    expect(dice).toHaveLength(10);
    dice.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    });
  });
});
