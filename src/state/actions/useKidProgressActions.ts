import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { faUtensils, faListCheck, faStar, faGamepad, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import type { GravyState } from '../types';
import { todayStr } from '../defaultState';
import { appendActionLog, markMostRecentUndone, type LogActor } from '../actionLog';
import { FOODS } from '../../data/foods';
import { GAMES } from '../../data/games';
import { applyBonusItem, reverseBonusItem } from '../points';
import { queuePendingPoints, takeMostRecentPending } from '../pendingPoints';
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
  // True on a device with no signed-in account (joined via family code only) — every
  // point-earning action below still completes immediately (todayGoals/todayFoodCounts/
  // counters/streaks/badges), but the points themselves are queued in pendingPointsAwards
  // instead of touching the live balance, until a parent approves/declines them from Approvals.
  requiresApproval: boolean;
}

// Live "today" point/streak/badge actions for the kid-facing UI (food tray, daily goals, bonus
// items, games). The point arithmetic lives in ../points.ts; these orchestrate counters, the
// action log, and the celebration/badge/rank-up side effects around it.
export function useKidProgressActions(deps: KidProgressDeps) {
  const { setState, showToast, showCelebration, awardPoints, checkBadges, maybeCelebrateRankUp, actorRef, requiresApproval } = deps;

  const logFood = useCallback((id: string) => {
    setState((prev) => {
      if ((prev.todayFoodCounts[id] || 0) >= 1) return prev;
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = (next.todayFoodCounts[id] || 0) + 1;
      next.counters.foodLogs[id] = (next.counters.foodLogs[id] || 0) + 1;
      const food = FOODS.find((f) => f.id === id);
      const label = `${food?.label ?? ''} logged!`;
      const isFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      const bonusTriggered = !wasFull && isFull && next.settings.bonusPts > 0;

      if (requiresApproval) {
        const totalPts = next.settings.foodPts + (bonusTriggered ? next.settings.bonusPts : 0);
        queuePendingPoints(next, 'food', id, totalPts, label);
        showToast(faHourglassHalf, `${label} — waiting for approval`);
      } else {
        awardPoints(next, next.settings.foodPts, label);
      }
      appendActionLog(next, actorRef.current, {
        type: 'food',
        label,
        pts: requiresApproval ? 0 : next.settings.foodPts,
        dateStr: todayStr(next.settings.timezone),
        itemId: id,
      });

      if (!wasFull && isFull) {
        next.counters.fullTrayDays++;
        if (bonusTriggered && !requiresApproval) {
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
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration, showToast, actorRef, requiresApproval]);

  const removeFood = useCallback((id: string) => {
    setState((prev) => {
      const currentCount = prev.todayFoodCounts[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = currentCount - 1;
      next.counters.foodLogs[id] = Math.max(0, (next.counters.foodLogs[id] || 0) - 1);
      // If this food's award (and any bundled Full Tray Bonus) is still pending approval,
      // cancel it instead of touching the balance — it was never credited.
      const pending = takeMostRecentPending(next, 'food', id);
      if (!pending) {
        // Exact inverse of logFood's award (see awardPoints note) — no zero-floor here.
        next.points -= next.settings.foodPts;
        next.totalPoints -= next.settings.foodPts;
        next.todayPoints -= next.settings.foodPts;
      }
      const isFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      if (wasFull && !isFull) {
        next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        if (next.settings.bonusPts > 0 && !pending) {
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
        const label = `${goal.name} done!`;
        if (requiresApproval) {
          queuePendingPoints(next, 'goal', id, goal.pts, label);
          showToast(faHourglassHalf, `${label} — waiting for approval`);
        } else {
          awardPoints(next, goal.pts, label);
        }
        appendActionLog(next, actorRef.current, {
          type: 'goal',
          label,
          pts: requiresApproval ? 0 : goal.pts,
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
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration, showToast, actorRef, requiresApproval]);

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
        // If this completion's award is still pending approval, cancel it instead of touching
        // the (never-credited) balance.
        const pending = takeMostRecentPending(next, 'goal', id);
        if (!pending) {
          // Exact inverse of incrementGoal's award (see awardPoints note) — no zero-floor here.
          next.points -= goal.pts;
          next.totalPoints -= goal.pts;
          next.todayPoints -= goal.pts;
        }
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
          if (requiresApproval) {
            queuePendingPoints(next, 'game', gameId, next.settings.gamePts, label);
            showToast(faHourglassHalf, `${label} — waiting for approval`);
          } else {
            awardPoints(next, next.settings.gamePts, label);
          }
          appendActionLog(next, actorRef.current, {
            type: 'game',
            label,
            pts: requiresApproval ? 0 : next.settings.gamePts,
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
  }, [setState, awardPoints, checkBadges, maybeCelebrateRankUp, showToast, actorRef, requiresApproval]);

  // Reverses a still-pending game-win award (counters.gamesWon/todayGameWins) when a parent
  // declines it from Approvals — there's no kid-facing "undo" for a game round, so this is only
  // ever dispatched by declinePendingPointsAward.
  const declineGameWin = useCallback((gameId: string) => {
    setState((prev) => {
      const hasPending = prev.pendingPointsAwards.some((p) => p.kind === 'game' && p.itemId === gameId);
      if (!hasPending) return prev;
      const next = clone(prev);
      takeMostRecentPending(next, 'game', gameId);
      next.counters.gamesWon = Math.max(0, next.counters.gamesWon - 1);
      next.todayGameWins = Math.max(0, next.todayGameWins - 1);
      markMostRecentUndone(next.actionLog, 'game', gameId, todayStr(next.settings.timezone));
      return next;
    });
  }, [setState]);

  const logBonusItem = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      if (!next.todayBonusApplied) next.todayBonusApplied = {};
      next.todayGoalCounts[id] = (next.todayGoalCounts[id] || 0) + 1;

      const sign = goal.pts < 0 ? '−' : '+';
      const label = `${sign}${Math.abs(goal.pts)} ${goal.name}`;
      if (requiresApproval) {
        // Forgiveness (see applyBonusItem) depends on the live balance, which hasn't been
        // touched yet — it's computed at approval time instead, against the balance then.
        queuePendingPoints(next, 'bonus', id, goal.pts, label);
        showToast(faHourglassHalf, `${goal.name} — waiting for approval`);
        appendActionLog(next, actorRef.current, {
          type: 'bonus',
          label,
          pts: 0,
          dateStr: todayStr(next.settings.timezone),
          itemId: id,
        });
      } else {
        const applied = applyBonusItem(next, goal.pts);
        next.todayBonusApplied[id] = (next.todayBonusApplied[id] || 0) + applied;
        showToast(faStar, label);
        appendActionLog(next, actorRef.current, {
          type: 'bonus',
          label,
          pts: applied,
          dateStr: todayStr(next.settings.timezone),
          itemId: id,
        });
      }
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [setState, showToast, maybeCelebrateRankUp, actorRef, requiresApproval]);

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

      // If this tap's award is still pending approval, cancel it instead of touching the
      // (never-credited) balance — nothing was ever added to todayBonusApplied either.
      const pending = takeMostRecentPending(next, 'bonus', id);
      if (!pending) {
        const net = next.todayBonusApplied[id] || 0;
        const reverse = reverseBonusItem(net, goal.pts);
        next.points += reverse;
        next.totalPoints += reverse;
        next.todayPoints += reverse;
        next.todayBonusApplied[id] = net + reverse;
      }
      markMostRecentUndone(next.actionLog, 'bonus', id, todayStr(next.settings.timezone));
      return next;
    });
  }, [setState]);

  return {
    logFood, removeFood, incrementGoal, decrementGoal, completeGameRound, declineGameWin,
    logBonusItem, undoBonusItem,
  };
}
