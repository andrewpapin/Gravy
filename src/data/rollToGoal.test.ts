import { describe, expect, it, vi } from 'vitest';
import {
  ROLL_TO_GOAL_MIN_TARGET,
  ROLL_TO_GOAL_MAX_TARGET,
  getDailyTarget,
  computeRoundOutcome,
  getRollToGoalPayout,
  rollDice,
  rerollDice,
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

describe('computeRoundOutcome', () => {
  it('busts whenever total exceeds target, regardless of rerolls remaining', () => {
    expect(computeRoundOutcome(25, 20, 3)).toEqual({ tier: 'bust', bust: true, distance: 5, displayScore: 0 });
    expect(computeRoundOutcome(21, 20, 0)).toEqual({ tier: 'bust', bust: true, distance: 1, displayScore: 0 });
  });

  it('scores an exact match at 500 base', () => {
    const result = computeRoundOutcome(20, 20, 0);
    expect(result).toEqual({ tier: 'exact', bust: false, distance: 0, displayScore: 500 });
  });

  it('scores 1/2/3+ away at 300/150/50 base', () => {
    expect(computeRoundOutcome(19, 20, 0).displayScore).toBe(300);
    expect(computeRoundOutcome(18, 20, 0).displayScore).toBe(150);
    expect(computeRoundOutcome(17, 20, 0).displayScore).toBe(50);
    expect(computeRoundOutcome(10, 20, 0).displayScore).toBe(50);
    expect(computeRoundOutcome(19, 20, 0).tier).toBe('near1');
    expect(computeRoundOutcome(18, 20, 0).tier).toBe('near2');
    expect(computeRoundOutcome(17, 20, 0).tier).toBe('far');
  });

  it('adds +50 per unused reroll on top of the base tier score', () => {
    expect(computeRoundOutcome(20, 20, 1).displayScore).toBe(550);
    expect(computeRoundOutcome(20, 20, 2).displayScore).toBe(600);
    expect(computeRoundOutcome(20, 20, 3).displayScore).toBe(650);
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
    const dice = rollDice(5);
    expect(dice).toHaveLength(5);
    dice.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    });
  });
});

describe('rerollDice', () => {
  it('leaves held indexes unchanged and rerolls the rest', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // always rolls a 1
    const current = [6, 6, 6, 6, 6];
    const held = new Set([0, 2]);
    const result = rerollDice(current, held);
    expect(result).toEqual([6, 1, 6, 1, 1]);
    vi.restoreAllMocks();
  });
});
