import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Goal, GravyState, Reward } from '../types';
import { applyDayRollover, cloneDefaultState } from '../defaultState';
import { appendAuditLog } from '../auditLog';
import type { LogActor } from '../actionLog';
import { FOODS } from '../../data/foods';
import { isValidTimezone } from '../../data/timezones';
import { safeRemoveItem } from '../storage';
import { HOUSEHOLD_CODE_KEY, SYNC_SKIPPED_KEY, clone } from './shared';
import type { SettableSettingKey, SyncStatus } from './types';

// Friendly names for the Admin Log's settingChanged entries (Epic 8 item 6).
const SETTING_LABELS: Partial<Record<SettableSettingKey, string>> = {
  childName: 'child name',
  bonusPts: 'bonus points',
  gamePts: 'game points',
  theme: 'theme',
  avatarIcon: 'avatar icon',
  avatarIconColor: 'avatar icon color',
  avatarBgColor: 'avatar background color',
  timezone: 'time zone',
};

export interface CatalogDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  actorRef: MutableRefObject<LogActor | undefined>;
  // resetAll disconnects sync before wiping, so it needs these provider-level handles.
  pendingTimersRef: MutableRefObject<number[]>;
  setHouseholdCode: Dispatch<SetStateAction<string | null>>;
  lastSyncedRef: MutableRefObject<string | null>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
}

// Parent catalog CRUD (goals, rewards), settings, and the danger-zone resets.
// These append to the shared household auditLog (not the per-kid actionLog) and are never undoable.
export function useCatalogActions(deps: CatalogDeps) {
  const { setState, actorRef, pendingTimersRef, setHouseholdCode, lastSyncedRef, setSyncStatus } = deps;

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.goals.push({ id: Date.now(), ...goal });
      appendAuditLog(next, actorRef.current, { type: 'goalAdded', label: `Added ${goal.isDaily === false ? 'bonus item' : 'goal'} "${goal.name}"` });
      return next;
    });
  }, [setState, actorRef]);

  const removeGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const next = clone(prev);
      next.goals = next.goals.filter((g) => g.id !== id);
      next.todayGoals = next.todayGoals.filter((g) => g !== id);
      appendAuditLog(next, actorRef.current, { type: 'goalRemoved', label: `Removed goal "${goal.name}"` });
      return next;
    });
  }, [setState, actorRef]);

  const updateGoal = useCallback((id: number, patch: Partial<Omit<Goal, 'id'>>) => {
    setState((prev) => {
      const next = clone(prev);
      const goal = next.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const isDailyChanged = 'isDaily' in patch && (patch.isDaily !== false) !== (goal.isDaily !== false);
      Object.assign(goal, patch);
      // Flipping a goal between Daily and Bonus changes how its today-state is interpreted,
      // so drop any in-progress completion/step counts to avoid a phantom carried-over state.
      if (isDailyChanged) {
        next.todayGoals = next.todayGoals.filter((g) => g !== id);
        if (next.todayGoalCounts) delete next.todayGoalCounts[id];
        if (goal.isDaily === false) goal.target = undefined;
      }
      appendAuditLog(next, actorRef.current, { type: 'goalUpdated', label: `Edited goal "${goal.name}"` });
      return next;
    });
  }, [setState, actorRef]);

  const addReward = useCallback((reward: Omit<Reward, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.rewards.push({ id: Date.now(), ...reward });
      appendAuditLog(next, actorRef.current, { type: 'rewardAdded', label: `Added reward "${reward.name}" (${reward.cost} pts)` });
      return next;
    });
  }, [setState, actorRef]);

  const updateReward = useCallback((id: number, patch: Partial<Omit<Reward, 'id'>>) => {
    setState((prev) => {
      const next = clone(prev);
      const reward = next.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      Object.assign(reward, patch);
      appendAuditLog(next, actorRef.current, { type: 'rewardUpdated', label: `Edited reward "${reward.name}"` });
      return next;
    });
  }, [setState, actorRef]);

  const removeReward = useCallback((id: number) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      const next = clone(prev);
      next.rewards = next.rewards.filter((r) => r.id !== id);
      next.pendingRewards = next.pendingRewards.filter((pr) => pr.rewardId !== id);
      appendAuditLog(next, actorRef.current, { type: 'rewardRemoved', label: `Removed reward "${reward.name}"` });
      return next;
    });
  }, [setState, actorRef]);

  const saveSetting = useCallback((key: SettableSettingKey, val: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (key === 'childName') {
        next.settings.childName = val.trim() || 'Zack';
      } else if (key === 'bonusPts') {
        next.settings.bonusPts = Math.max(0, parseInt(val) || 0);
      } else if (key === 'theme') {
        if (val === 'capri' || val === 'classic' || val === 'twopointoh') {
          next.settings.theme = val;
        }
      } else if (key === 'avatarIcon') {
        next.settings.avatarIcon = val;
      } else if (key === 'avatarIconColor' || key === 'avatarBgColor') {
        next.settings[key] = val;
      } else if (key === 'timezone') {
        if (isValidTimezone(val)) next.settings.timezone = val;
      } else {
        (next.settings[key] as number) = Math.max(0, parseInt(val) || 0);
      }
      // Audit only real changes (blur-saves can fire with no actual edit).
      if (JSON.stringify(next.settings) !== JSON.stringify(prev.settings)) {
        const name = SETTING_LABELS[key] ?? key;
        appendAuditLog(next, actorRef.current, {
          type: 'settingChanged',
          label: `Changed ${name} to "${val}"`,
        });
      }
      return next;
    });
  }, [setState, actorRef]);

  // Points per food group are configured per-item (Settings.foodPtsByItem) rather than
  // through the generic saveSetting, since a single food id's value must be set independently.
  const saveFoodPts = useCallback((foodId: string, val: string) => {
    setState((prev) => {
      const next = clone(prev);
      const clamped = Math.max(1, parseInt(val) || 1);
      next.settings.foodPtsByItem = { ...next.settings.foodPtsByItem, [foodId]: clamped };
      if (clamped !== (prev.settings.foodPtsByItem[foodId] ?? clamped)) {
        const food = FOODS.find((f) => f.id === foodId);
        appendAuditLog(next, actorRef.current, {
          type: 'settingChanged',
          label: `Changed ${food?.label ?? foodId} points to "${clamped}"`,
        });
      }
      return next;
    });
  }, [setState, actorRef]);

  const resetToday = useCallback(() => {
    setState((prev) => {
      const next = clone(prev);
      next.points = Math.max(0, next.points - next.todayPoints);
      next.totalPoints = Math.max(0, next.totalPoints - next.todayPoints);
      next.todayPoints = 0;
      next.todayFoodCounts = {};
      next.todayGoals = [];
      next.todayGoalCounts = {};
      next.todayBonusApplied = {};
      appendAuditLog(next, actorRef.current, { type: 'resetToday', label: "Reset today's progress" });
      return next;
    });
  }, [setState, actorRef]);

  const resetAll = useCallback(() => {
    // Cancel any deferred rank-up celebrations queued by an action just before the
    // reset — otherwise one could still fire afterward, announcing progress that no longer exists.
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    // Disconnect from household sync before resetting so the blank state
    // doesn't propagate to all other family devices.
    safeRemoveItem(HOUSEHOLD_CODE_KEY);
    safeRemoveItem(SYNC_SKIPPED_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    setState((prev) => {
      const next = cloneDefaultState();
      // "Reset Everything" wipes progress (points, history, goals, rewards) but
      // keeps personalization settings — the kid's name/look.
      next.settings.childName = prev.settings.childName;
      next.settings.theme = prev.settings.theme;
      next.settings.avatarIcon = prev.settings.avatarIcon;
      next.settings.avatarIconColor = prev.settings.avatarIconColor;
      next.settings.avatarBgColor = prev.settings.avatarBgColor;
      // Preserve the household audit trail across a reset (don't let "reset everything" erase
      // its own evidence), then record the reset itself.
      next.auditLog = prev.auditLog;
      appendAuditLog(next, actorRef.current, { type: 'resetAll', label: 'Reset everything' });
      return applyDayRollover(next);
    });
  }, [setState, actorRef, pendingTimersRef, setHouseholdCode, lastSyncedRef, setSyncStatus]);

  return { addGoal, removeGoal, updateGoal, addReward, updateReward, removeReward, saveSetting, saveFoodPts, resetToday, resetAll };
}
