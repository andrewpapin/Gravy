// Pure logic for the "Roll to the Goal" daily dice game. Kept free of any `state/` import (same
// layering as data/games.ts) — callers pass in whatever date/timezone-derived string they need.

export const ROLL_TO_GOAL_GAME_ID = 'rollgoal';
// Full 10d6 range is 10-60 (mean 35, stdev ~5.4) — the band below is the old 5d6 band's z-scores
// (mean-0.39σ to mean+2.49σ) reapplied to 10 dice, so exact/near1/near2/far stay about as rare as
// before even though there's no more hold-and-incrementally-improve strategy (see
// ROLL_TO_GOAL_ATTEMPTS_PER_ROUND) — three independent blind rolls per round, closest kept.
export const ROLL_TO_GOAL_MIN_TARGET = 33;
export const ROLL_TO_GOAL_MAX_TARGET = 48;
export const ROLL_TO_GOAL_ROUNDS_PER_DAY = 3;
// Each round is 3 independent full rerolls of all dice (no per-die holding) — whichever attempt
// lands closest to the target is automatically kept as the round's result.
export const ROLL_TO_GOAL_ATTEMPTS_PER_ROUND = 3;
export const ROLL_TO_GOAL_DICE_COUNT = 10;

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

// Real-Gravy-points payout scaling vs. settings.gamePts — scales the base award down for a
// farther-off roll, while still rewarding accuracy.
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

export interface AttemptOutcome {
  dice: number[];
  total: number;
  bust: boolean; // total > target — can't come from above
  distance: number; // target - total; +Infinity when bust
}

// Evaluates one full roll of all dice against the target.
export function evaluateAttempt(dice: number[], target: number): AttemptOutcome {
  const total = sumDice(dice);
  if (total > target) {
    return { dice, total, bust: true, distance: Number.POSITIVE_INFINITY };
  }
  return { dice, total, bust: false, distance: target - total };
}

// Picks the smallest-distance non-bust attempt among the round's independent rolls; if every
// attempt busted, there's nothing to prefer between them, so just return the first.
export function pickBestAttempt(attempts: AttemptOutcome[]): AttemptOutcome {
  const nonBust = attempts.filter((a) => !a.bust);
  if (nonBust.length === 0) return attempts[0];
  return nonBust.reduce((best, a) => (a.distance < best.distance ? a : best));
}

export interface RoundOutcome {
  tier: ScoreTier;
  bust: boolean;
  distance: number; // target - total; meaningless when bust
  displayScore: number; // 0-500 — bragging-rights score only
  total: number; // the kept attempt's dice total
}

export function computeRoundOutcome(best: AttemptOutcome): RoundOutcome {
  if (best.bust) {
    return { tier: 'bust', bust: true, distance: best.distance, displayScore: 0, total: best.total };
  }
  const distance = best.distance;
  const tier: Exclude<ScoreTier, 'bust'> =
    distance === 0 ? 'exact' : distance === 1 ? 'near1' : distance === 2 ? 'near2' : 'far';
  return { tier, bust: false, distance, displayScore: TIER_DISPLAY_SCORE[tier], total: best.total };
}

// Scales settings.gamePts by tier and rounds to a whole point.
export function getRollToGoalPayout(tier: ScoreTier, gamePts: number): number {
  if (tier === 'bust') return 0;
  return Math.round(gamePts * ROLL_TO_GOAL_PAYOUT_PCT[tier]);
}
