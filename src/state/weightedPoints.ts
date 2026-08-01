// Dynamic Point Weighting for the food tray (Settings.weightedFoodPtsEnabled).
//
// A flat points-per-food-group value treats every habit the same: a kid who eats protein daily and
// never touches a vegetable earns the same 10 points for the easy one as for the one the parent is
// actually trying to build. When weighting is on, each participating food's configured base points
// are scaled by how often that food has been logged over the trailing window, measured against the
// other participating foods — under-eaten groups become worth more, everyday ones less.
//
// Two things keep this from misfiring:
//
//  - Foods can be excluded per item (Settings.weightedFoodPtsExcluded). An excluded food is pinned
//    to its base value *and* left out of the peer average, so it neither moves nor moves anything
//    else. Sweets ship excluded — "eaten rarely" is the goal there, so rewarding scarcity would
//    invert the whole mechanic. (Concretely: with sweets included at 0/30 days, sweets would be
//    boosted to 14pts *and* would drag the mean down enough to cut veggie's boost from 18 to 16.)
//
//  - Weights are a pure function of the days *strictly before* the as-of date, so they are already
//    constant for the whole of any given day and change only at the rollover boundary. Nothing is
//    cached: a stored copy would need reconciling across devices on every sync, and could go stale
//    against the dayLogs it was derived from.
//
// Exact-undo does NOT depend on any of that. Awards are recorded in GravyState.todayFoodApplied /
// DayLog.foodApplied and reversed from there, so a removal returns precisely what was given even
// if the base value, the config, or the window itself changed in between. See points.ts.
import type { GravyState, Settings } from './types';
import { FOODS } from '../data/foods';
import { addDaysToDateStr } from './defaultState';

// Trailing window the "how often is this eaten" rate is measured over — the parent-facing framing
// is "this month's trend". The as-of day itself is excluded: it's still in progress, and letting it
// count would make a food's value depend on whether it had already been tapped that morning.
export const WEIGHT_WINDOW_DAYS = 30;
// Multiplier bounds. A 10pt food therefore ranges 5–20pts: wide enough for the nudge to be felt,
// narrow enough that no food becomes worth ignoring the rest of the tray for.
export const WEIGHT_MIN = 0.5;
export const WEIGHT_MAX = 2.0;
// How hard a deviation from the peer average pushes the multiplier. At 1.5, a food eaten 6 days
// more often than average over 30 days lands at 0.7x; the clamps take over past roughly ±0.33.
export const WEIGHT_SENSITIVITY = 1.5;
// Below this many logged days inside the window, every multiplier stays neutral. A household three
// days into using the app has no meaningful trend, and swinging their points off that noise would
// make the feature feel arbitrary at exactly the moment they're deciding whether to trust it.
export const WEIGHT_MIN_ACTIVE_DAYS = 7;

export const NEUTRAL_WEIGHT = 1;

// Whether a food participates in weighting at all. An excluded food keeps its base value exactly
// and takes no part in the peer average.
export function isFoodWeighted(settings: Settings, foodId: string): boolean {
  if (!settings.weightedFoodPtsEnabled) return false;
  return settings.weightedFoodPtsExcluded?.[foodId] !== true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Multiplier per Food.id for the window ending the day *before* `asOfDateStr`. Every food gets an
// entry; excluded foods, the disabled case and the cold-start case are all exactly NEUTRAL_WEIGHT.
//
// Reads only `state.dayLogs` for days before `asOfDateStr` — never the live today-counters — which
// is what makes the result constant across a whole day. `asOfDateStr` is a parameter rather than
// derived from the clock so past-day edits can price a day using that day's own trend, and so this
// stays pure and testable.
export function computeFoodWeights(state: GravyState, asOfDateStr: string): Record<string, number> {
  const neutral = Object.fromEntries(FOODS.map((f) => [f.id, NEUTRAL_WEIGHT]));
  if (!state.settings.weightedFoodPtsEnabled) return neutral;

  const eligible = FOODS.filter((f) => isFoodWeighted(state.settings, f.id));
  // Fewer than two participating foods has nothing to compare against — and guards 0/0 -> NaN.
  if (eligible.length < 2) return neutral;

  // One pass over the window, collecting both the per-food day counts and how many days had any
  // food logged at all (the cold-start guard's input).
  const daysLogged: Record<string, number> = {};
  let activeDays = 0;
  for (let i = 1; i <= WEIGHT_WINDOW_DAYS; i++) {
    const log = state.dayLogs[addDaysToDateStr(asOfDateStr, -i)];
    if (!log) continue;
    let any = false;
    for (const food of eligible) {
      if ((log.foodCounts?.[food.id] || 0) > 0) {
        daysLogged[food.id] = (daysLogged[food.id] || 0) + 1;
        any = true;
      }
    }
    if (any) activeDays++;
  }
  if (activeDays < WEIGHT_MIN_ACTIVE_DAYS) return neutral;

  // Rates are over the whole window, not just the active days: skipping a day is itself a signal,
  // and dividing by active days would make a food look "always eaten" off two logged days.
  const rates = eligible.map((f) => (daysLogged[f.id] || 0) / WEIGHT_WINDOW_DAYS);
  const mean = rates.reduce((sum, r) => sum + r, 0) / rates.length;

  const out = { ...neutral };
  eligible.forEach((food, i) => {
    out[food.id] = clamp(1 + (mean - rates[i]) * WEIGHT_SENSITIVITY, WEIGHT_MIN, WEIGHT_MAX);
  });
  return out;
}

// Applies a multiplier to a base point value. Rounds to a whole number (points are always banked
// and shown as integers) and never lets a positive base round away to nothing — a 1pt food scaled
// by 0.5 stays worth 1 rather than becoming a free tap.
//
// A base of 0 or less passes through untouched: saveFoodPts clamps parent input to >= 1, but
// sanitizeFoodPtsByItem accepts any finite number and the legacy foodPts migration carries old
// values through unclamped, so weighting must not quietly rewrite such a value to 1.
export function applyWeight(basePts: number, weight: number): number {
  if (basePts <= 0 || weight === NEUTRAL_WEIGHT) return basePts;
  return Math.max(1, Math.round(basePts * weight));
}
