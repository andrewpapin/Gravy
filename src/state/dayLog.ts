import type { DayLog, GravyState } from './types';

export function getDayLog(state: GravyState, dateStr: string, today: string): DayLog | null {
  if (dateStr === today) {
    const bonusIds = new Set(state.goals.filter((g) => g.isDaily === false).map((g) => g.id));
    const bonusCounts: Record<number, number> = {};
    for (const [id, count] of Object.entries(state.todayGoalCounts || {})) {
      if (bonusIds.has(Number(id))) bonusCounts[Number(id)] = count;
    }
    return {
      foodCounts: state.todayFoodCounts,
      goalIds: state.todayGoals,
      points: state.todayPoints,
      bonusCounts,
    };
  }
  return state.dayLogs[dateStr] ?? null;
}

export function hasAnyLog(log: DayLog | null): boolean {
  if (!log) return false;
  return (
    Object.values(log.foodCounts).some((c) => c > 0) ||
    log.goalIds.length > 0 ||
    log.points > 0 ||
    Object.values(log.bonusCounts || {}).some((c) => c > 0)
  );
}
