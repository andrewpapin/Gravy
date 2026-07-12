import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { GravyState } from '../types';
import { todayStr } from '../defaultState';
import { appendActionLog, type LogActor } from '../actionLog';
import { applyAward, applyBonusItem } from '../points';
import { clone } from './shared';
import type { MaybeCelebrateRankUp } from './types';

export interface PendingPointsDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  stateRef: MutableRefObject<GravyState>;
  maybeCelebrateRankUp: MaybeCelebrateRankUp;
  actorRef: MutableRefObject<LogActor | undefined>;
  // The exact-inverse "today" actions (from useKidProgressActions) that cancel a still-pending
  // award and revert its non-point completion state (todayGoals/todayFoodCounts/counters) — a
  // decline dispatches to the one matching the pending entry's kind, the same way
  // undoActionLogEntry dispatches a Log undo.
  decrementGoal: (id: number) => void;
  removeFood: (id: string) => void;
  undoBonusItem: (id: number) => void;
  declineGameWin: (gameId: string) => void;
  declineRollToGoalRound: () => void;
}

// Approve/decline flow for points earned on a kid-only device (no signed-in account) — see
// src/state/pendingPoints.ts. Mirrors useRewardActions' request/approve/decline shape, but in
// the opposite direction: the completion already happened live, only the point credit is gated.
export function usePendingPointsActions(deps: PendingPointsDeps) {
  const {
    setState, stateRef, maybeCelebrateRankUp, actorRef,
    decrementGoal, removeFood, undoBonusItem, declineGameWin, declineRollToGoalRound,
  } = deps;

  const approvePendingPointsAward = useCallback((id: string) => {
    setState((prev) => {
      const pending = prev.pendingPointsAwards.find((p) => p.id === id);
      if (!pending) return prev;
      const next = clone(prev);
      next.pendingPointsAwards = next.pendingPointsAwards.filter((p) => p.id !== id);
      if (pending.kind === 'bonus') {
        if (!next.todayBonusApplied) next.todayBonusApplied = {};
        const applied = applyBonusItem(next, pending.pts);
        const itemId = pending.itemId as number;
        next.todayBonusApplied[itemId] = (next.todayBonusApplied[itemId] || 0) + applied;
      } else {
        applyAward(next, pending.pts);
      }
      appendActionLog(next, actorRef.current, {
        type: 'pointsApproved',
        label: `${pending.label} approved`,
        pts: pending.pts,
        dateStr: todayStr(next.settings.timezone),
        itemId: pending.itemId,
      });
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [setState, maybeCelebrateRankUp, actorRef]);

  const declinePendingPointsAward = useCallback((id: string) => {
    const pending = stateRef.current.pendingPointsAwards.find((p) => p.id === id);
    if (!pending) return;
    // Undo the underlying completion (todayGoals/todayFoodCounts/counters) exactly as if the
    // kid had cancelled it themselves — these also remove the pending entry, since it's still
    // pending, instead of subtracting from the (never-credited) balance.
    switch (pending.kind) {
      case 'goal':
        decrementGoal(pending.itemId as number);
        break;
      case 'food':
        removeFood(pending.itemId as string);
        break;
      case 'bonus':
        undoBonusItem(pending.itemId as number);
        break;
      case 'game':
        declineGameWin(pending.itemId as string);
        break;
      case 'rollgoal':
        declineRollToGoalRound();
        break;
    }
    setState((prev) => {
      const next = clone(prev);
      appendActionLog(next, actorRef.current, {
        type: 'pointsDeclined',
        label: `${pending.label} declined`,
        pts: 0,
        dateStr: todayStr(next.settings.timezone),
        itemId: pending.itemId,
      });
      return next;
    });
  }, [stateRef, setState, actorRef, decrementGoal, removeFood, undoBonusItem, declineGameWin, declineRollToGoalRound]);

  return { approvePendingPointsAward, declinePendingPointsAward };
}
