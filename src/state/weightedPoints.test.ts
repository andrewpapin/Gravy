import { describe, expect, it } from 'vitest';
import { addDaysToDateStr, cloneDefaultState } from './defaultState';
import { getBaseFoodPts, getFoodPts } from './points';
import {
  NEUTRAL_WEIGHT, WEIGHT_MAX, WEIGHT_MIN, WEIGHT_MIN_ACTIVE_DAYS, WEIGHT_WINDOW_DAYS,
  applyWeight, computeFoodWeights, isFoodWeighted,
} from './weightedPoints';
import type { GravyState } from './types';

const AS_OF = '2026-08-01';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.settings.weightedFoodPtsEnabled = true;
  state.dayLogs = {};
  return state;
}

// Writes `days` days of history ending the day before AS_OF. `eaten` maps a food id to how many of
// those days it was logged on — always the most recent ones, which is what a real trend looks like.
function seedHistory(state: GravyState, days: number, eaten: Record<string, number>): void {
  for (let i = 1; i <= days; i++) {
    const dateStr = addDaysToDateStr(AS_OF, -i);
    const foodCounts: Record<string, number> = {};
    for (const [foodId, count] of Object.entries(eaten)) {
      if (i <= count) foodCounts[foodId] = 1;
    }
    state.dayLogs[dateStr] = { foodCounts, goalIds: [], points: 0 };
  }
}

describe('isFoodWeighted', () => {
  it('is false for every food while the feature is off', () => {
    const state = cloneDefaultState();
    expect(state.settings.weightedFoodPtsEnabled).toBe(false);
    expect(isFoodWeighted(state.settings, 'veggie')).toBe(false);
  });

  it('excludes sweets by default so never eating them cannot inflate their value', () => {
    const state = freshState();
    expect(isFoodWeighted(state.settings, 'sweets')).toBe(false);
    expect(isFoodWeighted(state.settings, 'veggie')).toBe(true);
  });

  it('treats a food absent from the exclusion map as participating', () => {
    const state = freshState();
    delete state.settings.weightedFoodPtsExcluded.sweets;
    expect(isFoodWeighted(state.settings, 'sweets')).toBe(true);
  });
});

describe('computeFoodWeights', () => {
  it('returns neutral weights for every food when the feature is off', () => {
    const state = freshState();
    state.settings.weightedFoodPtsEnabled = false;
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const weights = computeFoodWeights(state, AS_OF);
    expect(Object.values(weights).every((w) => w === NEUTRAL_WEIGHT)).toBe(true);
  });

  it('stays neutral below the cold-start threshold, and engages at it', () => {
    const cold = freshState();
    seedHistory(cold, WEIGHT_MIN_ACTIVE_DAYS - 1, { protein: 6, veggie: 0, fruit: 3, dairy: 3, grain: 3 });
    expect(computeFoodWeights(cold, AS_OF).protein).toBe(NEUTRAL_WEIGHT);

    const warm = freshState();
    seedHistory(warm, WEIGHT_MIN_ACTIVE_DAYS, { protein: 7, veggie: 0, fruit: 4, dairy: 4, grain: 4 });
    expect(computeFoodWeights(warm, AS_OF).protein).toBeLessThan(NEUTRAL_WEIGHT);
  });

  // The scenario the feature was built for: eats protein constantly, never touches vegetables.
  it('reduces an everyday food and boosts an avoided one', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const weights = computeFoodWeights(state, AS_OF);

    // Eligible rates: protein 1.0, veggie 0.0, others 0.5 -> mean 0.5.
    expect(weights.protein).toBe(WEIGHT_MIN); // 1 + (0.5-1.0)*1.5 = 0.25, clamped
    expect(weights.veggie).toBeCloseTo(1.75); // 1 + (0.5-0.0)*1.5
    expect(weights.fruit).toBeCloseTo(1);
    expect(weights.sweets).toBe(NEUTRAL_WEIGHT); // excluded

    const base = getBaseFoodPts(state.settings, 'veggie');
    expect(base).toBe(10);
    expect(applyWeight(base, weights.protein)).toBe(5);
    expect(applyWeight(base, weights.veggie)).toBe(18);
  });

  // The parent's stated worry, as a number: including sweets would both reward avoiding them and
  // dilute the mean, cutting the boost on the food that actually deserves it.
  it('keeps an excluded food out of the peer average entirely', () => {
    const excluded = freshState();
    seedHistory(excluded, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const withExclusion = computeFoodWeights(excluded, AS_OF);

    const included = freshState();
    included.settings.weightedFoodPtsExcluded = {};
    seedHistory(included, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const withoutExclusion = computeFoodWeights(included, AS_OF);

    expect(withExclusion.sweets).toBe(NEUTRAL_WEIGHT);
    // Included, sweets would be boosted to 16pts purely for being avoided — and would drag the
    // mean down far enough that vegetables, the food actually worth encouraging, drop from 18 to
    // the same 16. Avoiding dessert would pay exactly as well as eating your greens.
    expect(applyWeight(10, withoutExclusion.sweets)).toBe(16);
    expect(applyWeight(10, withExclusion.veggie)).toBe(18);
    expect(applyWeight(10, withoutExclusion.veggie)).toBe(16);
  });

  it('gives every food a neutral weight when they are all eaten equally often', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 15, veggie: 15, fruit: 15, dairy: 15, grain: 15 });
    const weights = computeFoodWeights(state, AS_OF);
    for (const w of Object.values(weights)) expect(w).toBeCloseTo(1);
  });

  it('never exceeds the clamp in either direction', () => {
    const state = freshState();
    // Maximum possible spread: one food every day, the rest never.
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 0, dairy: 0, grain: 0 });
    const weights = computeFoodWeights(state, AS_OF);
    for (const w of Object.values(weights)) {
      expect(w).toBeGreaterThanOrEqual(WEIGHT_MIN);
      expect(w).toBeLessThanOrEqual(WEIGHT_MAX);
    }
    expect(weights.protein).toBe(WEIGHT_MIN);
  });

  it('counts the oldest day in the window but ignores anything outside it', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const baseline = computeFoodWeights(state, AS_OF).veggie;

    // A veggie logged one day beyond the window must not move anything.
    state.dayLogs[addDaysToDateStr(AS_OF, -(WEIGHT_WINDOW_DAYS + 1))] = {
      foodCounts: { veggie: 1 }, goalIds: [], points: 0,
    };
    expect(computeFoodWeights(state, AS_OF).veggie).toBe(baseline);

    // One on the window's oldest day must.
    state.dayLogs[addDaysToDateStr(AS_OF, -WEIGHT_WINDOW_DAYS)].foodCounts.veggie = 1;
    expect(computeFoodWeights(state, AS_OF).veggie).toBeLessThan(baseline);
  });

  it('ignores the as-of day itself, so a value cannot move mid-day', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const before = computeFoodWeights(state, AS_OF);
    state.dayLogs[AS_OF] = { foodCounts: { veggie: 1 }, goalIds: [], points: 0 };
    expect(computeFoodWeights(state, AS_OF)).toEqual(before);
  });

  it('stays neutral when fewer than two foods participate', () => {
    const state = freshState();
    state.settings.weightedFoodPtsExcluded = {
      fruit: true, veggie: true, protein: true, dairy: true, grain: true, sweets: true,
    };
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const weights = computeFoodWeights(state, AS_OF);
    for (const w of Object.values(weights)) expect(w).toBe(NEUTRAL_WEIGHT);
  });

  it('derives different weights for two kids sharing identical settings', () => {
    const picky = freshState();
    seedHistory(picky, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const adventurous = freshState();
    seedHistory(adventurous, 30, { protein: 0, veggie: 30, fruit: 15, dairy: 15, grain: 15 });

    expect(computeFoodWeights(picky, AS_OF).veggie).toBeGreaterThan(1);
    expect(computeFoodWeights(adventurous, AS_OF).veggie).toBeLessThan(1);
  });
});

describe('applyWeight', () => {
  it('rounds to whole points', () => {
    expect(applyWeight(10, 1.75)).toBe(18);
    expect(applyWeight(15, 0.7)).toBe(11);
  });

  it('never rounds a positive value away to nothing', () => {
    expect(applyWeight(1, WEIGHT_MIN)).toBe(1);
  });

  it('passes a non-positive base straight through rather than inventing a value', () => {
    expect(applyWeight(0, 1.75)).toBe(0);
    expect(applyWeight(-5, 1.75)).toBe(-5);
  });
});

describe('getFoodPts', () => {
  it('returns the configured base while weighting is off', () => {
    const state = cloneDefaultState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    expect(getFoodPts(state, 'veggie', AS_OF)).toBe(10);
    expect(getFoodPts(state, 'protein', AS_OF)).toBe(10);
  });

  it('scales the configured base once weighting is on', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    expect(getFoodPts(state, 'veggie', AS_OF)).toBe(18);
    expect(getFoodPts(state, 'protein', AS_OF)).toBe(5);
    expect(getFoodPts(state, 'sweets', AS_OF)).toBe(10);
  });

  it('scales a parent-edited base rather than replacing it', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    state.settings.foodPtsByItem.veggie = 20;
    expect(getFoodPts(state, 'veggie', AS_OF)).toBe(35); // 20 * 1.75
  });

  // Why logFood/logFoodForDay record what they awarded instead of letting the removal re-derive
  // it. Each of these moves the value of an already-banked award, and the Log's Undo can be tapped
  // long after the fact — see undoActionLogEntry, which routes by date, so an award made today is
  // reversed through the past-day path from tomorrow onward.
  it('changes what a food is worth when the config or the window moves', () => {
    const state = freshState();
    seedHistory(state, 30, { protein: 30, veggie: 0, fruit: 15, dairy: 15, grain: 15 });
    const awarded = getFoodPts(state, 'veggie', AS_OF);
    expect(awarded).toBe(18);

    // Weighting switched off between the award and the undo.
    const disabled = freshState();
    disabled.dayLogs = state.dayLogs;
    disabled.settings.weightedFoodPtsEnabled = false;
    expect(getFoodPts(disabled, 'veggie', AS_OF)).toBe(10);

    // Veggie excluded between the award and the undo.
    const excluded = freshState();
    excluded.dayLogs = state.dayLogs;
    excluded.settings.weightedFoodPtsExcluded = { sweets: true, veggie: true };
    expect(getFoodPts(excluded, 'veggie', AS_OF)).toBe(10);

    // Or simply: the window slid forward a day and the trend moved with it.
    expect(getFoodPts(state, 'veggie', addDaysToDateStr(AS_OF, 1))).not.toBe(awarded);
  });

  it('prices a past day on that day\'s own trend, not today\'s', () => {
    const state = freshState();
    // Veggie eaten every day up to a month ago, never since.
    seedHistory(state, 60, { protein: 60, veggie: 0, fruit: 30, dairy: 30, grain: 30 });
    for (let i = 31; i <= 60; i++) {
      state.dayLogs[addDaysToDateStr(AS_OF, -i)].foodCounts.veggie = 1;
    }
    const nowPts = getFoodPts(state, 'veggie', AS_OF);
    const thenPts = getFoodPts(state, 'veggie', addDaysToDateStr(AS_OF, -30));
    expect(nowPts).toBeGreaterThan(thenPts);
  });
});
