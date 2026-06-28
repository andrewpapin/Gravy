import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { faUtensils, faListCheck, faStar, faGamepad } from '@fortawesome/free-solid-svg-icons';
import type { GravyState } from '../types';
import { todayStr } from '../defaultState';
import { appendActionLog, markMostRecentUndone, type LogActor } from '../actionLog';
import { FOODS } from '../../data/foods';
import { GAMES } from '../../data/games';
import { applyBonusItem, reverseBonusItem } from '../points';
import { DAILY_GAME_WIN_CAP, clone } from './shared';
import type { AwardPoints, CheckBadges, MaybeCelebrateRankUp, ShowCelebration, ShowToast } from './types';

export interface KidProgressDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  showToast: ShowToast;
  showCelebration: ShowCelebration;
  awardPoints: AwardPoints;
  checkBadges: CheckBadges;
  maybeCelebrateRankUp: MaybeCelebrateRankUp;
  actorRef: MutableRefObject<LogActor | undefined>;
}

// Live "today" point/streak/badge actions for the kid-facing UI (food tray, daily goals, bonus
// items, games). The point arithmetic lives in ../points.ts; these orchestrate counters, the
// action log, and the celebration/badge/rank-up side effects around it.
export function useKidProgressActions(deps: KidProgressDeps) {
  const { setState, showToast, showCelebration, awardPoints, checkBadges, maybeCelebrateRankUp, actorRef } = deps;

  const logFood = useCallback((id: string) => {
    setState((prev) => {
      if ((prev.todayFoodCounts[id] || 0) >= 1) return prev;
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = (next.todayFoodCounts[id] || 0) + 1;
      next.counters.foodLogs[id] = (next.counters.foodLogs[id] || 0) + 1;
      const food = FOODS.find((f) => f.id === id);
      const label = `${food?.label ?? ''} logged!`;
      awardPoints(next, next.settings.foodPts, label);
      appendActionLog(next, actorRef.current, {
        type: 'food',
        label,
        pts: next.settings.foodPts,
        dateStr: todayStr(next.settings.timezone),
        itemId: id,
      });

      const isFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      if (!wasFull && isFull) {
        next.counters.fullTrayDays++;
        if (next.settings.bonusPts > 0) {
          // Silent — the celebration overlay already announces the bonus.
          awardPoints(next, next.settings.bonusPts, '🎉 Full Tray Bonus!', { silent: true });
        }
        // Only daily goals count toward combo badge
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        const allDailyGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => next.todayGoals.includes(g.id));
        if (allDailyGoalsDone) next.counters.comboDays++;
        showCelebration(faUtensils, 'Full Tray!', `All 5 food groups eaten! +${next.settings.bonusPts} bonus!`);
      }
      // Defer badge/rank-up announcements so they don't pile up on top of the celebration overlay.
      const delay = !wasFull && isFull ? 1400 : 0;
      maybeCelebrateRankUp(prev.totalPoints, next, delay);
      checkBadges(next, delay);
      return next;
    });
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration, actorRef]);

  const removeFood = useCallback((id: string) => {
    setState((prev) => {
      const currentCount = prev.todayFoodCounts[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = currentCount - 1;
      next.counters.foodLogs[id] = Math.max(0, (next.counters.foodLogs[id] || 0) - 1);
      // Exact inverse of logFood's award (see awardPoints note) — no zero-floor here.
      next.points -= next.settings.foodPts;
      next.totalPoints -= next.settings.foodPts;
      next.todayPoints -= next.settings.foodPts;
      const isFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      if (wasFull && !isFull) {
        next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        if (next.settings.bonusPts > 0) {
          next.points -= next.settings.bonusPts;
          next.totalPoints -= next.settings.bonusPts;
          next.todayPoints -= next.settings.bonusPts;
        }
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => next.todayGoals.includes(g.id));
        if (allGoalsDone) next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
      }
      markMostRecentUndone(next.actionLog, 'food', id, todayStr(next.settings.timezone));
      return next;
    });
  }, [setState]);

  const incrementGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const target = goal.target || 1;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = currentCount + 1;
      if (currentCount + 1 >= target && !next.todayGoals.includes(id)) {
        next.todayGoals.push(id);
        next.counters.totalGoals++;
        awardPoints(next, goal.pts, `${goal.name} done!`);
        appendActionLog(next, actorRef.current, {
          type: 'goal',
          label: `${goal.name} done!`,
          pts: goal.pts,
          dateStr: todayStr(next.settings.timezone),
          itemId: id,
        });
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        // Rising edge: this completion finished the last outstanding daily goal.
        const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => next.todayGoals.includes(g.id));
        if (allGoalsDone) {
          next.counters.allGoalsDays++;
          const fullTray = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
          if (fullTray) next.counters.comboDays++;
          showCelebration(faListCheck, 'All Goals Done!', `Every daily goal complete${fullTray ? ' — perfect day!' : ''}!`);
        }
        // Defer rank-up/badge announcements so they don't pile onto the celebration overlay.
        const delay = allGoalsDone ? 1400 : 0;
        maybeCelebrateRankUp(prev.totalPoints, next, delay);
        checkBadges(next, delay);
      }
      return next;
    });
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration, actorRef]);

  const decrementGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const target = goal.target || 1;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      const newCount = currentCount - 1;
      next.todayGoalCounts[id] = newCount;
      if (newCount < target && next.todayGoals.includes(id)) {
        next.todayGoals = next.todayGoals.filter((g) => g !== id);
        next.counters.totalGoals = Math.max(0, next.counters.totalGoals - 1);
        // Exact inverse of incrementGoal's award (see awardPoints note) — no zero-floor here.
        next.points -= goal.pts;
        next.totalPoints -= goal.pts;
        next.todayPoints -= goal.pts;
        markMostRecentUndone(next.actionLog, 'goal', id, todayStr(next.settings.timezone));
      }
      return next;
    });
  }, [setState]);

  const completeGameRound = useCallback((gameId: string, won: boolean) => {
    setState((prev) => {
      const next = clone(prev);
      next.counters.gamesPlayed++;
      if (won) {
        next.counters.gamesWon++;
        const game = GAMES.find((g) => g.id === gameId);
        if (next.todayGameWins < DAILY_GAME_WIN_CAP) {
          next.todayGameWins++;
          const label = `🎉 ${game?.name ?? 'Game'} win!`;
          awardPoints(next, next.settings.gamePts, label);
          appendActionLog(next, actorRef.current, {
            type: 'game',
            label,
            pts: next.settings.gamePts,
            dateStr: todayStr(next.settings.timezone),
            itemId: gameId,
          });
        } else {
          showToast(faGamepad, "Nice win! Today's game points are maxed — keep playing for fun!");
        }
        maybeCelebrateRankUp(prev.totalPoints, next);
        checkBadges(next);
      }
      return next;
    });
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showToast, actorRef]);

  const logBonusItem = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      if (!next.todayBonusApplied) next.todayBonusApplied = {};
      next.todayGoalCounts[id] = (next.todayGoalCounts[id] || 0) + 1;

      const applied = applyBonusItem(next, goal.pts);
      next.todayBonusApplied[id] = (next.todayBonusApplied[id] || 0) + applied;

      const sign = goal.pts < 0 ? '−' : '+';
      showToast(faStar, `${sign}${Math.abs(goal.pts)} ${goal.name}`);
      appendActionLog(next, actorRef.current, {
        type: 'bonus',
        label: `${sign}${Math.abs(goal.pts)} ${goal.name}`,
        pts: applied,
        dateStr: todayStr(next.settings.timezone),
        itemId: id,
      });
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [setState, showToast, maybeCelebrateRankUp, actorRef]);

  const undoBonusItem = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      if (!next.todayBonusApplied) next.todayBonusApplied = {};
      next.todayGoalCounts[id] = currentCount - 1;

      const net = next.todayBonusApplied[id] || 0;
      const reverse = reverseBonusItem(net, goal.pts);
      next.points += reverse;
      next.totalPoints += reverse;
      next.todayPoints += reverse;
      next.todayBonusApplied[id] = net + reverse;
      markMostRecentUndone(next.actionLog, 'bonus', id, todayStr(next.settings.timezone));
      return next;
    });
  }, [setState]);

  return { logFood, removeFood, incrementGoal, decrementGoal, completeGameRound, logBonusItem, undoBonusItem };
}
