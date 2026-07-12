// Pure logic for the "Roll to the Goal" daily dice game. Kept free of any `state/` import (same
// layering as data/games.ts) — callers pass in whatever date/timezone-derived string they need.

export const ROLL_TO_GOAL_GAME_ID = 'rollgoal';
// Full 5d6 range is 5-30, but the extremes are trivially easy/impossible — keep the daily target
// inside a band that's always reachable but rarely guaranteed on the initial roll.
export const ROLL_TO_GOAL_MIN_TARGET = 16;
export const ROLL_TO_GOAL_MAX_TARGET = 27;
export const ROLL_TO_GOAL_ROUNDS_PER_DAY = 3;
export const ROLL_TO_GOAL_REROLLS_PER_ROUND = 3;
export const ROLL_TO_GOAL_DICE_COUNT = 5;
const REROLL_BONUS_PER_UNUSED = 50;

// FNV-1a 32-bit string hash → mulberry32 PRNG. Deterministic per dateStr (not Math.random()), so
// every device/household member sees the same daily target for the same day.
function hashStringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic function of dateStr — deliberately not persisted in GravyState. Recomputed on
// demand from todayStr(settings.timezone), so it needs no Supabase sync/merge handling.
export function getDailyTarget(dateStr: string): number {
  const rng = mulberry32(hashStringToSeed(`rollgoal-${dateStr}`));
  const range = ROLL_TO_GOAL_MAX_TARGET - ROLL_TO_GOAL_MIN_TARGET + 1;
  return ROLL_TO_GOAL_MIN_TARGET + Math.floor(rng() * range);
}

export function rollDice(count: number = ROLL_TO_GOAL_DICE_COUNT): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
}

// Rerolls only the indexes NOT in `held`; held dice pass through unchanged.
export function rerollDice(current: number[], held: ReadonlySet<number>): number[] {
  return current.map((v, i) => (held.has(i) ? v : 1 + Math.floor(Math.random() * 6)));
}

export function sumDice(dice: number[]): number {
  return dice.reduce((a, b) => a + b, 0);
}

export type ScoreTier = 'exact' | 'near1' | 'near2' | 'far' | 'bust';

const TIER_DISPLAY_SCORE: Record<Exclude<ScoreTier, 'bust'>, number> = {
  exact: 500,
  near1: 300,
  near2: 150,
  far: 50,
};

// Real-Gravy-points payout scaling vs. settings.gamePts — keeps this game's point economy in
// line with the flat-award other arcade games pay, while still rewarding accuracy. The reroll
// bonus deliberately affects only the displayed score below, not the real payout.
export const ROLL_TO_GOAL_PAYOUT_PCT: Record<Exclude<ScoreTier, 'bust'>, number> = {
  exact: 1,
  near1: 0.6,
  near2: 0.3,
  far: 0.1,
};

export const TIER_LABELS: Record<ScoreTier, string> = {
  exact: 'Exact match!',
  near1: '1 away',
  near2: '2 away',
  far: '3+ away',
  bust: 'Bust!',
};

export interface RoundOutcome {
  tier: ScoreTier;
  bust: boolean;
  distance: number; // target - total; meaningless when bust
  displayScore: number; // 0-500 base + reroll bonus (0 if bust) — bragging-rights score only
}

export function computeRoundOutcome(total: number, target: number, rerollsRemaining: number): RoundOutcome {
  if (total > target) {
    return { tier: 'bust', bust: true, distance: total - target, displayScore: 0 };
  }
  const distance = target - total;
  const tier: Exclude<ScoreTier, 'bust'> =
    distance === 0 ? 'exact' : distance === 1 ? 'near1' : distance === 2 ? 'near2' : 'far';
  const displayScore = TIER_DISPLAY_SCORE[tier] + rerollsRemaining * REROLL_BONUS_PER_UNUSED;
  return { tier, bust: false, distance, displayScore };
}

// Scales settings.gamePts by tier and rounds to a whole point.
export function getRollToGoalPayout(tier: ScoreTier, gamePts: number): number {
  if (tier === 'bust') return 0;
  return Math.round(gamePts * ROLL_TO_GOAL_PAYOUT_PCT[tier]);
}
