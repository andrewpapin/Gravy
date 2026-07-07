import { useMemo } from 'react';
import { useGravy } from './GravyContext';
import {
  getActivityHeatmap,
  getFavoriteFoods,
  getGamesBreakdown,
  getGoalsTrend,
  getPersonalBests,
  getPointsHistory,
  getRewardsHistory,
} from './statsSnapshot';

/** Derives every Stats-page data module from GravyState in one memoized pass — the seam
 * between the pure statsSnapshot.ts functions and the section components that render them,
 * so those components don't need to know how their data is computed. */
export function useStatsSnapshot() {
  const { state } = useGravy();

  return useMemo(() => ({
    pointsHistory: getPointsHistory(state),
    activityHeatmap: getActivityHeatmap(state),
    favoriteFoods: getFavoriteFoods(state),
    goalsTrend: getGoalsTrend(state),
    gamesBreakdown: getGamesBreakdown(state),
    personalBests: getPersonalBests(state),
    rewardsHistory: getRewardsHistory(state),
  }), [state]);
}
