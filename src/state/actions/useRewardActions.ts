import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { faCircleXmark, faCircleCheck, faTriangleExclamation, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import type { GravyState } from '../types';
import { todayStr } from '../defaultState';
import { appendActionLog, type LogActor } from '../actionLog';
import { clone } from './shared';
import type { CheckBadges, ShowToast } from './types';

export interface RewardDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  showToast: ShowToast;
  checkBadges: CheckBadges;
  actorRef: MutableRefObject<LogActor | undefined>;
}

// Reward request/approve/decline flow. requestReward reserves points already promised to other
// pending requests so a kid can't queue more than their balance covers.
export function useRewardActions(deps: RewardDeps) {
  const { setState, showToast, checkBadges, actorRef } = deps;

  const requestReward = useCallback((id: number) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      if (prev.pendingRewards.some((p) => p.rewardId === id)) return prev;
      // Reserve points already promised to other pending requests so a kid can't queue
      // several requests that together exceed their balance.
      const reserved = prev.pendingRewards.reduce((sum, p) => {
        const r = prev.rewards.find((rw) => rw.id === p.rewardId);
        return sum + (r?.cost ?? 0);
      }, 0);
      const spendable = prev.points - reserved;
      if (spendable < reward.cost) {
        showToast(faCircleXmark, `Need ${reward.cost - spendable} more points!`);
        return prev;
      }
      const next = clone(prev);
      const pr = { id: Date.now().toString(), rewardId: id };
      next.pendingRewards.push(pr);
      next.counters.totalRewards++;
      showToast(faEnvelope, `${reward.name} requested!`);
      appendActionLog(next, actorRef.current, {
        type: 'rewardRequested',
        label: `${reward.name} requested!`,
        pts: 0,
        dateStr: todayStr(next.settings.timezone),
        itemId: id,
      });
      checkBadges(next);
      return next;
    });
  }, [setState, checkBadges, showToast, actorRef]);

  const approveReward = useCallback((prId: string) => {
    setState((prev) => {
      const pr = prev.pendingRewards.find((p) => p.id === prId);
      if (!pr) return prev;
      const next = clone(prev);
      const reward = next.rewards.find((r) => r.id === pr.rewardId);
      next.pendingRewards = next.pendingRewards.filter((p) => p.id !== prId);
      if (reward) {
        const shortfall = reward.cost - next.points;
        next.points = Math.max(0, next.points - reward.cost);
        const label = shortfall > 0
          ? `${reward.name} approved — balance was short by ${shortfall} pts`
          : `${reward.name} approved!`;
        showToast(shortfall > 0 ? faTriangleExclamation : faCircleCheck, label);
        appendActionLog(next, actorRef.current, {
          type: 'rewardApproved',
          label,
          pts: -(prev.points - next.points),
          dateStr: todayStr(next.settings.timezone),
          itemId: pr.rewardId,
        });
      }
      return next;
    });
  }, [setState, showToast, actorRef]);

  const declineReward = useCallback((prId: string) => {
    setState((prev) => {
      const next = clone(prev);
      next.pendingRewards = next.pendingRewards.filter((p) => p.id !== prId);
      showToast(faCircleXmark, 'Request declined');
      appendActionLog(next, actorRef.current, {
        type: 'rewardDeclined',
        label: 'Request declined',
        pts: 0,
        dateStr: todayStr(next.settings.timezone),
      });
      return next;
    });
  }, [setState, showToast, actorRef]);

  return { requestReward, approveReward, declineReward };
}
