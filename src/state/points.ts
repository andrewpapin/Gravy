import type { DayLog, GravyState } from './types';

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
