import { getRank, RANKS } from '../data/ranks';
import { FOODS } from '../data/foods';
import { useGravy } from './GravyContext';

/** Shared rank/streak/today-progress derivation, used by both the kid-facing
 * StatsCard and the parent dashboard's Overview screen. */
export function useTodaySnapshot() {
  const { state } = useGravy();
  const { rank, index } = getRank(state.totalPoints);

  const hasLoggedToday =
    Object.keys(state.todayFoodCounts).length > 0 ||
    state.todayGoals.length > 0 ||
    state.todayPoints > 0 ||
    Object.values(state.todayGoalCounts || {}).some((c) => c > 0);
  const streakAtRisk = state.streak > 0 && !hasLoggedToday;

  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const goalCounts = state.todayGoalCounts || {};
  const goalsDone = dailyGoals.filter((g) => (goalCounts[g.id] || 0) >= (g.target || 1)).length;
  const foodDone = eatenCount === FOODS.length;
  const goalsAllDone = dailyGoals.length > 0 && goalsDone === dailyGoals.length;

  // The internal lifetime total can momentarily dip below zero after a big deduction;
  // clamp for the rank/XP display so the progress bar never shows negative.
  const displayTotal = Math.max(0, state.totalPoints);

  let xpText: string;
  let pct: number;
  if (index < RANKS.length - 1) {
    const next = RANKS[index + 1];
    const progress = displayTotal - rank.min;
    const needed = next.min - rank.min;
    pct = Math.min(100, Math.max(0, Math.round((progress / needed) * 100)));
    xpText = `${displayTotal - rank.min}/${needed} pts`;
  } else {
    pct = 100;
    xpText = 'MAX RANK! 👑';
  }

  return {
    rank,
    index,
    xpText,
    pct,
    eatenCount,
    foodDone,
    dailyGoals,
    goalsDone,
    goalsAllDone,
    hasLoggedToday,
    streakAtRisk,
  };
}
