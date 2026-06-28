import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ActionLogEntry, GravyState } from '../types';
import { backfillStreaksFromLogs, todayStr } from '../defaultState';
import { appendActionLog, markMostRecentUndone, type LogActor } from '../actionLog';
import { FOODS } from '../../data/foods';
import { resolveToastIcon } from '../../data/icons';
import { applyBonusItemForDay, reverseBonusItem } from '../points';
import { clone } from './shared';
import type { AwardPointsForDay, CheckBadges, MaybeCelebrateRankUp, ShowToast } from './types';

export interface DayEditDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  stateRef: MutableRefObject<GravyState>;
  showToast: ShowToast;
  awardPointsForDay: AwardPointsForDay;
  checkBadges: CheckBadges;
  maybeCelebrateRankUp: MaybeCelebrateRankUp;
  actorRef: MutableRefObject<LogActor | undefined>;
  // Today-scoped inverses (from useKidProgressActions) that undoActionLogEntry dispatches to.
  removeFood: (id: string) => void;
  decrementGoal: (id: number) => void;
  undoBonusItem: (id: number) => void;
}

// Past-day point/streak edits used by the parent Calendar (PIN-gated). Full point-parity with the
// "today" actions above — they award/remove via awardPointsForDay and re-run streaks/badges/rank
// so editing a past day moves the live balance exactly as if it were edited today.
export function useDayEditActions(deps: DayEditDeps) {
  const {
    setState, stateRef, showToast, awardPointsForDay, checkBadges, maybeCelebrateRankUp, actorRef,
    removeFood, decrementGoal, undoBonusItem,
  } = deps;

  const logFoodForDay = useCallback((dateStr: string, foodId: string) => {
    setState((prev) => {
      if ((prev.dayLogs[dateStr]?.foodCounts[foodId] || 0) >= 1) return prev;
      const next = clone(prev);
      if (!next.dayLogs[dateStr]) {
        next.dayLogs[dateStr] = { foodCounts: {}, goalIds: [], points: 0 };
      }
      const log = next.dayLogs[dateStr];
      const wasFullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);

      log.foodCounts[foodId] = (log.foodCounts[foodId] || 0) + 1;
      next.counters.foodLogs[foodId] = (next.counters.foodLogs[foodId] || 0) + 1;

      // Editing a past day from the Calendar (now PIN-gated under Grown-Ups) flows into
      // the live balance/lifetime total exactly like logging the same item today does.
      const food = FOODS.find((f) => f.id === foodId);
      const label = `${food?.label ?? ''} added!`;
      awardPointsForDay(next, log, next.settings.foodPts, label);
      appendActionLog(next, actorRef.current, {
        type: 'food',
        label,
        pts: next.settings.foodPts,
        dateStr,
        itemId: foodId,
      });

      const isFullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
      if (!wasFullTray && isFullTray) {
        next.counters.fullTrayDays++;
        if (next.settings.bonusPts > 0) {
          awardPointsForDay(next, log, next.settings.bonusPts, 'Full Tray Bonus!', { silent: true });
        }
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        if (dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id))) {
          next.counters.comboDays++;
        }
      }

      backfillStreaksFromLogs(next);
      maybeCelebrateRankUp(prev.totalPoints, next);
      checkBadges(next);
      return next;
    });
  }, [setState, awardPointsForDay, checkBadges, maybeCelebrateRankUp, actorRef]);

  const removeFoodForDay = useCallback((dateStr: string, foodId: string) => {
    setState((prev) => {
      const log = prev.dayLogs[dateStr];
      if (!log || (log.foodCounts[foodId] || 0) <= 0) return prev;

      const next = clone(prev);
      const nextLog = next.dayLogs[dateStr];
      const wasFullTray = FOODS.every((f) => (nextLog.foodCounts[f.id] || 0) > 0);
      const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
      const wasAllGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => nextLog.goalIds.includes(g.id));

      nextLog.foodCounts[foodId] = Math.max(0, (nextLog.foodCounts[foodId] || 0) - 1);
      next.counters.foodLogs[foodId] = Math.max(0, (next.counters.foodLogs[foodId] || 0) - 1);

      // Exact inverse of logFoodForDay's award (see awardPoints note) — no zero-floor here,
      // so re-adding the same item afterward lands back exactly where the balance was.
      const foodPts = next.settings.foodPts;
      next.points -= foodPts;
      next.totalPoints -= foodPts;
      nextLog.points -= foodPts;

      const isFullTray = FOODS.every((f) => (nextLog.foodCounts[f.id] || 0) > 0);
      if (wasFullTray && !isFullTray) {
        next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        const bonus = next.settings.bonusPts;
        if (bonus > 0) {
          next.points -= bonus;
          next.totalPoints -= bonus;
          nextLog.points -= bonus;
        }
        if (wasAllGoalsDone) {
          next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
        }
      }

      markMostRecentUndone(next.actionLog, 'food', foodId, dateStr);
      backfillStreaksFromLogs(next);
      return next;
    });
  }, [setState]);

  const toggleGoalForDay = useCallback((dateStr: string, goalId: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;

      const next = clone(prev);
      if (!next.dayLogs[dateStr]) {
        next.dayLogs[dateStr] = { foodCounts: {}, goalIds: [], points: 0 };
      }
      const log = next.dayLogs[dateStr];
      const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
      const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);

      if (log.goalIds.includes(goalId)) {
        const wasAllGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
        log.goalIds = log.goalIds.filter((id) => id !== goalId);
        next.counters.totalGoals = Math.max(0, next.counters.totalGoals - 1);
        // Exact inverse of the "complete" branch's award below (see awardPoints note) —
        // no zero-floor here, so toggling back off lands back exactly where it started.
        next.points -= goal.pts;
        next.totalPoints -= goal.pts;
        log.points -= goal.pts;
        if (wasAllGoalsDone) {
          next.counters.allGoalsDays = Math.max(0, next.counters.allGoalsDays - 1);
          if (fullTray) next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
        }
        markMostRecentUndone(next.actionLog, 'goal', goalId, dateStr);
      } else {
        log.goalIds.push(goalId);
        next.counters.totalGoals++;
        // Editing a past day from the Calendar (now PIN-gated under Grown-Ups) flows into
        // the live balance/lifetime total exactly like completing the goal today does.
        const label = `${goal.name} logged!`;
        awardPointsForDay(next, log, goal.pts, label);
        appendActionLog(next, actorRef.current, {
          type: 'goal',
          label,
          pts: goal.pts,
          dateStr,
          itemId: goalId,
        });
        const isAllGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
        if (isAllGoalsDone) {
          next.counters.allGoalsDays++;
          if (fullTray) next.counters.comboDays++;
        }
        maybeCelebrateRankUp(prev.totalPoints, next);
        checkBadges(next);
      }

      backfillStreaksFromLogs(next);
      return next;
    });
  }, [setState, awardPointsForDay, checkBadges, maybeCelebrateRankUp, actorRef]);

  const logBonusItemForDay = useCallback((dateStr: string, goalId: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;
      const next = clone(prev);
      if (!next.dayLogs[dateStr]) {
        next.dayLogs[dateStr] = { foodCounts: {}, goalIds: [], points: 0, bonusCounts: {}, bonusApplied: {} };
      }
      const log = next.dayLogs[dateStr];
      if (!log.bonusCounts) log.bonusCounts = {};
      if (!log.bonusApplied) log.bonusApplied = {};
      log.bonusCounts[goalId] = (log.bonusCounts[goalId] || 0) + 1;

      const applied = applyBonusItemForDay(next, log, goal.pts);
      log.bonusApplied[goalId] = (log.bonusApplied[goalId] || 0) + applied;

      const sign = goal.pts < 0 ? '−' : '+';
      showToast(resolveToastIcon(goal.icon, goal.emoji), `${sign}${Math.abs(goal.pts)} ${goal.name}`);
      appendActionLog(next, actorRef.current, {
        type: 'bonus',
        label: `${sign}${Math.abs(goal.pts)} ${goal.name}`,
        pts: applied,
        dateStr,
        itemId: goalId,
      });
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [setState, showToast, maybeCelebrateRankUp, actorRef]);

  const undoBonusItemForDay = useCallback((dateStr: string, goalId: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      const log = prev.dayLogs[dateStr];
      if (!goal || !log) return prev;
      const currentCount = (log.bonusCounts || {})[goalId] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      const nextLog = next.dayLogs[dateStr];
      if (!nextLog.bonusCounts) nextLog.bonusCounts = {};
      if (!nextLog.bonusApplied) nextLog.bonusApplied = {};
      nextLog.bonusCounts[goalId] = currentCount - 1;

      const net = nextLog.bonusApplied[goalId] || 0;
      const reverse = reverseBonusItem(net, goal.pts);
      next.points += reverse;
      next.totalPoints += reverse;
      nextLog.points += reverse;
      nextLog.bonusApplied[goalId] = net + reverse;
      markMostRecentUndone(next.actionLog, 'bonus', goalId, dateStr);
      return next;
    });
  }, [setState]);

  // Dispatches a Log entry's Undo to the same exact-inverse action the live UI would call —
  // today's actions vs. the *ForDay variant, chosen by comparing the entry's day to today.
  const undoActionLogEntry = useCallback((entry: ActionLogEntry) => {
    const isToday = entry.dateStr === todayStr(stateRef.current.settings.timezone);
    switch (entry.type) {
      case 'food':
        if (isToday) removeFood(entry.itemId as string);
        else removeFoodForDay(entry.dateStr, entry.itemId as string);
        break;
      case 'goal':
        if (isToday) decrementGoal(entry.itemId as number);
        else toggleGoalForDay(entry.dateStr, entry.itemId as number);
        break;
      case 'bonus':
        if (isToday) undoBonusItem(entry.itemId as number);
        else undoBonusItemForDay(entry.dateStr, entry.itemId as number);
        break;
      default:
        break;
    }
  }, [stateRef, removeFood, removeFoodForDay, decrementGoal, toggleGoalForDay, undoBonusItem, undoBonusItemForDay]);

  return { logFoodForDay, removeFoodForDay, toggleGoalForDay, logBonusItemForDay, undoBonusItemForDay, undoActionLogEntry };
}
