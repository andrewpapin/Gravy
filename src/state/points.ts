import type { DayLog, GravyState, Settings } from './types';
import { DEFAULT_FOOD_PTS, todayStr } from './defaultState';
import { NEUTRAL_WEIGHT, applyWeight, computeFoodWeights, isFoodWeighted } from './weightedPoints';

// The configured points for a single food item, keyed by Food.id — each food group has its own
// independently configurable value (see Settings.foodPtsByItem). Weighting is deliberately NOT
// applied: this is the parent-configured base, used wherever that base is what's meant (the
// Points panel's inputs, and as the input to getFoodPts below).
export function getBaseFoodPts(settings: Settings, foodId: string): number {
  return settings.foodPtsByItem[foodId] ?? DEFAULT_FOOD_PTS;
}

// The points a food pays on `asOfDateStr` (default today): its configured base, scaled by the
// Dynamic Point Weighting multiplier for that day if the feature is on (see weightedPoints.ts).
// Returns the base unchanged when weighting is off or the food is excluded.
//
// Takes the whole state, not just settings, because the multiplier is derived from dayLogs. Callers
// editing a past day pass that day's date so it's priced on its own trend rather than today's.
//
// This is the *award* value. Reversals do not call back into it — they read what was actually
// awarded out of todayFoodApplied / DayLog.foodApplied, which is what keeps an undo exact even
// when the base, the config, or the trailing window has moved in between.
export function getFoodPts(state: GravyState, foodId: string, asOfDateStr?: string): number {
  const base = getBaseFoodPts(state.settings, foodId);
  if (!isFoodWeighted(state.settings, foodId)) return base;
  const asOf = asOfDateStr ?? todayStr(state.settings.timezone);
  return applyWeight(base, computeFoodWeights(state, asOf)[foodId] ?? NEUTRAL_WEIGHT);
}

// Awards points and updates today's running max. The balance is intentionally not floored
// here so an award and its later exact-inverse removal cancel out precisely (flooring would
// let a kid re-log an item they'd already spent to mint points). Negative balances are
// floored only where they're displayed (TopBar / rank) and where they're spent (approveReward).
export function applyAward(next: GravyState, pts: number): void {
  next.points += pts;
  next.totalPoints += pts;
  next.todayPoints += pts;
  if (next.todayPoints > (next.counters.maxDayPoints || 0)) {
    next.counters.maxDayPoints = next.todayPoints;
  }
}

// Same as applyAward, but targets a past day's own log.points instead of todayPoints.
export function applyAwardForDay(next: GravyState, log: DayLog, pts: number): void {
  next.points += pts;
  next.totalPoints += pts;
  log.points += pts;
  if (log.points > (next.counters.maxDayPoints || 0)) {
    next.counters.maxDayPoints = log.points;
  }
}

// A bonus-item penalty (negative pts) is forgiven once the kid is broke: never deduct more
// than the current balance. Returns the amount actually applied so the caller can record it
// (in todayBonusApplied / DayLog.bonusApplied) for an exact-undo — handing back the full
// nominal amount on undo would mint points that were never really deducted.
export function applyBonusItem(next: GravyState, pts: number): number {
  // `|| 0` normalizes a -0 result (forgiven all the way to nothing) to +0, since
  // Object.is(-0, 0) is false and a signed zero offers no meaningful information here.
  const applied = pts >= 0 ? pts : -Math.min(-pts, Math.max(0, next.points)) || 0;
  next.points += applied;
  next.totalPoints += applied;
  next.todayPoints += applied;
  if (next.todayPoints > (next.counters.maxDayPoints || 0)) {
    next.counters.maxDayPoints = next.todayPoints;
  }
  return applied;
}

// Same as applyBonusItem, but targets a past day's own log.points instead of todayPoints.
export function applyBonusItemForDay(next: GravyState, log: DayLog, pts: number): number {
  const applied = pts >= 0 ? pts : -Math.min(-pts, Math.max(0, next.points)) || 0;
  next.points += applied;
  next.totalPoints += applied;
  log.points += applied;
  if (log.points > (next.counters.maxDayPoints || 0)) {
    next.counters.maxDayPoints = log.points;
  }
  return applied;
}

// Reverses only what a bonus-item tap actually applied (the `net` recorded by
// applyBonusItem/applyBonusItemForDay across all taps so far), bounded by a single tap's
// nominal value — so undoing a forgiven penalty returns nothing extra, and undo can never
// reverse more than one tap's worth even if called repeatedly.
export function reverseBonusItem(net: number, pts: number): number {
  return pts >= 0 ? -Math.min(pts, Math.max(0, net)) : Math.min(-pts, Math.max(0, -net));
}
