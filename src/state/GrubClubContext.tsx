import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  faCircleXmark,
  faCircleCheck,
  faCartShopping,
  faRotate,
  faTriangleExclamation,
  faEnvelope,
  faCloud,
  faUtensils,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import type { Goal, GrubClubState, Reward, Settings } from './types';
import { applyDayRollover, loadState, saveState, cloneDefaultState, migrateLegacyState } from './defaultState';
import { FOODS } from '../data/foods';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';
import {
  createHousehold as createHouseholdRow,
  fetchHousehold,
  generateHouseholdCode,
  pushHouseholdState,
  subscribeToHousehold,
} from './sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

const HOUSEHOLD_CODE_KEY = 'grubclub_household_code';
export const SYNC_SKIPPED_KEY = 'grubclub_sync_skipped';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  icon: IconDefinition | string;
  msg: string;
  action?: ToastAction;
}

export interface CelebrationData {
  icon: IconDefinition | string;
  title: string;
  sub: string;
}

interface GrubClubContextValue {
  state: GrubClubState;
  toasts: ToastItem[];
  celebration: CelebrationData | null;
  confettiTrigger: number;
  showToast: (icon: IconDefinition | string, msg: string, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
  hideCelebration: () => void;
  logFood: (id: string) => void;
  removeFood: (id: string) => void;
  incrementGoal: (id: number) => void;
  decrementGoal: (id: number) => void;
  logFoodForDay: (dateStr: string, foodId: string) => void;
  removeFoodForDay: (dateStr: string, foodId: string) => void;
  toggleGoalForDay: (dateStr: string, goalId: number) => void;
  requestReward: (id: number) => void;
  approveReward: (prId: string) => void;
  declineReward: (prId: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  removeGoal: (id: number) => void;
  updateGoal: (id: number, patch: Partial<Omit<Goal, 'id'>>) => void;
  addReward: (reward: Omit<Reward, 'id'>) => void;
  removeReward: (id: number) => void;
  saveSetting: (key: keyof Settings, val: string) => void;
  resetToday: () => void;
  resetAll: () => void;
  updateBadgeConfig: (id: string, key: 'enabled' | 'name' | 'emoji', value: string | boolean) => void;
  householdCode: string | null;
  syncStatus: SyncStatus;
  createHousehold: () => Promise<string | null>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => void;
}

const GrubClubContext = createContext<GrubClubContextValue | null>(null);

function clone(state: GrubClubState): GrubClubState {
  return JSON.parse(JSON.stringify(state));
}

let toastIdCounter = 0;

export function GrubClubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GrubClubState>(() => loadState());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [householdCode, setHouseholdCode] = useState<string | null>(() =>
    localStorage.getItem(HOUSEHOLD_CODE_KEY),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const lastSyncedRef = useRef<string | null>(null);
  const pendingTimersRef = useRef<number[]>([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Push local changes to Supabase when in a synced household
  useEffect(() => {
    if (!householdCode) return;
    const json = JSON.stringify(state);
    if (json === lastSyncedRef.current) return;
    setSyncStatus('syncing');
    const timeout = setTimeout(() => {
      pushHouseholdState(householdCode, state)
        .then(() => {
          lastSyncedRef.current = json;
          setSyncStatus('idle');
        })
        .catch(() => setSyncStatus('error'));
    }, 800);
    return () => clearTimeout(timeout);
  }, [state, householdCode]);

  // Receive remote changes from other devices in the household
  useEffect(() => {
    if (!householdCode) return;
    return subscribeToHousehold(householdCode, (remoteState) => {
      const json = JSON.stringify(remoteState);
      if (json === lastSyncedRef.current) return;
      lastSyncedRef.current = json;
      const migrated = clone(remoteState);
      migrateLegacyState(migrated as unknown as Record<string, unknown>);
      setState(applyDayRollover(migrated));
    });
  }, [householdCode]);

  // Re-check the day rollover whenever the tab regains focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setState((s) => applyDayRollover(clone(s)));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const showToast = useCallback((icon: IconDefinition | string, msg: string, action?: ToastAction) => {
    const id = ++toastIdCounter;
    setToasts((t) => [...t, { id, icon, msg, action }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, action ? 4500 : 2800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const showCelebration = useCallback((icon: IconDefinition | string, title: string, sub: string) => {
    setCelebration({ icon, title, sub });
    setConfettiTrigger((n) => n + 1);
  }, []);

  const hideCelebration = useCallback(() => setCelebration(null), []);

  // Awards points and mutates the given draft state in place
  const awardPoints = useCallback(
    (next: GrubClubState, pts: number, reason: string, opts?: { silent?: boolean; action?: ToastAction }) => {
      next.points += pts;
      next.totalPoints += pts;
      next.todayPoints += pts;
      if (next.todayPoints > (next.counters.maxDayPoints || 0)) {
        next.counters.maxDayPoints = next.todayPoints;
      }
      if (!opts?.silent) {
        showToast(`+${pts} ⭐`, reason || '', opts?.action);
      }
    },
    [showToast],
  );

  // Checks for newly-earned badges and announces them. When delayMs is set,
  // the announcement is deferred so it doesn't pile up on top of a
  // celebration overlay shown for the same action.
  const checkBadges = useCallback(
    (next: GrubClubState, delayMs = 0) => {
      const newlyEarned = findNewlyEarnedBadges(next);
      newlyEarned.forEach((id) => {
        next.earnedBadges.push(id);
        const display = getBadgeDisplay(next, id);
        if (display && display.enabled !== false) {
          if (delayMs > 0) {
            const timer = window.setTimeout(() => {
              showToast(display.emoji, `Badge unlocked: ${display.name}!`);
            }, delayMs);
            pendingTimersRef.current.push(timer);
          } else {
            showToast(display.emoji, `Badge unlocked: ${display.name}!`);
          }
        }
      });
    },
    [showToast],
  );

  const logFood = useCallback((id: string) => {
    setState((prev) => {
      const snapshot = clone(prev);
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = (next.todayFoodCounts[id] || 0) + 1;
      next.counters.foodLogs[id] = (next.counters.foodLogs[id] || 0) + 1;
      const food = FOODS.find((f) => f.id === id);

      const undo = () => {
        pendingTimersRef.current.forEach((t) => clearTimeout(t));
        pendingTimersRef.current = [];
        setState(() => snapshot);
      };
      awardPoints(next, next.settings.foodPts, `${food?.label ?? ''} logged!`, {
        action: { label: 'Undo', onClick: undo },
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
      // Defer badge toasts so they don't pile up on top of the celebration overlay.
      checkBadges(next, !wasFull && isFull ? 1400 : 0);
      return next;
    });
  }, [awardPoints, checkBadges, showCelebration]);

  const removeFood = useCallback((id: string) => {
    setState((prev) => {
      const currentCount = prev.todayFoodCounts[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      const wasFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      next.todayFoodCounts[id] = currentCount - 1;
      next.counters.foodLogs[id] = Math.max(0, (next.counters.foodLogs[id] || 0) - 1);
      next.points = Math.max(0, next.points - next.settings.foodPts);
      next.totalPoints = Math.max(0, next.totalPoints - next.settings.foodPts);
      next.todayPoints = Math.max(0, next.todayPoints - next.settings.foodPts);
      const isFull = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
      if (wasFull && !isFull) {
        next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        if (next.settings.bonusPts > 0) {
          next.points = Math.max(0, next.points - next.settings.bonusPts);
          next.totalPoints = Math.max(0, next.totalPoints - next.settings.bonusPts);
          next.todayPoints = Math.max(0, next.todayPoints - next.settings.bonusPts);
        }
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => next.todayGoals.includes(g.id));
        if (allGoalsDone) next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
      }
      return next;
    });
  }, []);

  const incrementGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const target = goal.target || 1;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      if (currentCount >= target) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = currentCount + 1;
      if (currentCount + 1 >= target && !next.todayGoals.includes(id)) {
        next.todayGoals.push(id);
        next.counters.totalGoals++;
        awardPoints(next, goal.pts, `${goal.name} done!`);
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        if (dailyGoals.length > 0 && dailyGoals.every((g) => next.todayGoals.includes(g.id))) {
          next.counters.allGoalsDays++;
          const fullTray = FOODS.every((f) => (next.todayFoodCounts[f.id] || 0) > 0);
          if (fullTray) next.counters.comboDays++;
        }
        checkBadges(next);
      }
      return next;
    });
  }, [awardPoints, checkBadges]);

  const decrementGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const target = goal.target || 1;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = currentCount - 1;
      if (currentCount >= target && next.todayGoals.includes(id)) {
        next.todayGoals = next.todayGoals.filter((g) => g !== id);
        next.counters.totalGoals = Math.max(0, next.counters.totalGoals - 1);
        next.points = Math.max(0, next.points - goal.pts);
        next.totalPoints = Math.max(0, next.totalPoints - goal.pts);
        next.todayPoints = Math.max(0, next.todayPoints - goal.pts);
      }
      return next;
    });
  }, []);

  const logFoodForDay = useCallback((dateStr: string, foodId: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (!next.dayLogs[dateStr]) {
        next.dayLogs[dateStr] = { foodCounts: {}, goalIds: [], points: 0 };
      }
      const log = next.dayLogs[dateStr];
      const wasFullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);

      log.foodCounts[foodId] = (log.foodCounts[foodId] || 0) + 1;
      next.counters.foodLogs[foodId] = (next.counters.foodLogs[foodId] || 0) + 1;

      const foodPts = next.settings.foodPts;
      next.points += foodPts;
      next.totalPoints += foodPts;
      log.points += foodPts;

      const isFullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
      if (!wasFullTray && isFullTray) {
        next.counters.fullTrayDays++;
        const bonus = next.settings.bonusPts;
        if (bonus > 0) {
          next.points += bonus;
          next.totalPoints += bonus;
          log.points += bonus;
        }
        const dailyGoals = next.goals.filter((g) => g.isDaily !== false);
        if (dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id))) {
          next.counters.comboDays++;
        }
      }

      if (log.points > (next.counters.maxDayPoints || 0)) {
        next.counters.maxDayPoints = log.points;
      }

      const food = FOODS.find((f) => f.id === foodId);
      showToast(food?.emoji ?? faUtensils, `${food?.label ?? ''} added!`);
      checkBadges(next);
      return next;
    });
  }, [showToast, checkBadges]);

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

      const foodPts = next.settings.foodPts;
      next.points = Math.max(0, next.points - foodPts);
      next.totalPoints = Math.max(0, next.totalPoints - foodPts);
      nextLog.points = Math.max(0, nextLog.points - foodPts);

      const isFullTray = FOODS.every((f) => (nextLog.foodCounts[f.id] || 0) > 0);
      if (wasFullTray && !isFullTray) {
        next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        const bonus = next.settings.bonusPts;
        if (bonus > 0) {
          next.points = Math.max(0, next.points - bonus);
          next.totalPoints = Math.max(0, next.totalPoints - bonus);
          nextLog.points = Math.max(0, nextLog.points - bonus);
        }
        if (wasAllGoalsDone) {
          next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
        }
      }

      return next;
    });
  }, []);

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
        next.points = Math.max(0, next.points - goal.pts);
        next.totalPoints = Math.max(0, next.totalPoints - goal.pts);
        log.points = Math.max(0, log.points - goal.pts);
        if (wasAllGoalsDone) {
          next.counters.allGoalsDays = Math.max(0, next.counters.allGoalsDays - 1);
          if (fullTray) next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
        }
      } else {
        log.goalIds.push(goalId);
        next.counters.totalGoals++;
        next.points += goal.pts;
        next.totalPoints += goal.pts;
        log.points += goal.pts;
        if (log.points > (next.counters.maxDayPoints || 0)) {
          next.counters.maxDayPoints = log.points;
        }
        const isAllGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
        if (isAllGoalsDone) {
          next.counters.allGoalsDays++;
          if (fullTray) next.counters.comboDays++;
        }
        showToast(goal.emoji, `${goal.name} logged!`);
        checkBadges(next);
      }

      return next;
    });
  }, [showToast, checkBadges]);

  const requestReward = useCallback((id: number) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      if (prev.pendingRewards.some((p) => p.rewardId === id)) return prev;
      if (prev.points < reward.cost) {
        showToast(faCircleXmark, `Need ${reward.cost - prev.points} more points!`);
        return prev;
      }
      const next = clone(prev);
      const pr = { id: Date.now().toString(), rewardId: id };
      next.pendingRewards.push(pr);
      next.counters.totalRewards++;
      showToast(faEnvelope, `${reward.name} requested!`);
      checkBadges(next);
      return next;
    });
  }, [checkBadges, showToast]);

  const approveReward = useCallback((prId: string) => {
    setState((prev) => {
      const pr = prev.pendingRewards.find((p) => p.id === prId);
      if (!pr) return prev;
      const next = clone(prev);
      const reward = next.rewards.find((r) => r.id === pr.rewardId);
      next.pendingRewards = next.pendingRewards.filter((p) => p.id !== prId);
      if (reward) {
        next.points = Math.max(0, next.points - reward.cost);
        showToast(faCircleCheck, `${reward.name} approved!`);
      }
      return next;
    });
  }, [showToast]);

  const declineReward = useCallback((prId: string) => {
    setState((prev) => {
      const next = clone(prev);
      next.pendingRewards = next.pendingRewards.filter((p) => p.id !== prId);
      showToast(faCircleXmark, 'Request declined');
      return next;
    });
  }, [showToast]);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.goals.push({ id: Date.now(), ...goal });
      showToast(faCircleCheck, `"${goal.name}" added!`);
      return next;
    });
  }, [showToast]);

  const removeGoal = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const snapshot = clone(prev);
      const next = clone(prev);
      next.goals = next.goals.filter((g) => g.id !== id);
      next.todayGoals = next.todayGoals.filter((g) => g !== id);
      showToast(faTrashCan, `"${goal.name}" removed`, {
        label: 'Undo',
        onClick: () => setState(() => snapshot),
      });
      return next;
    });
  }, [showToast]);

  const updateGoal = useCallback((id: number, patch: Partial<Omit<Goal, 'id'>>) => {
    setState((prev) => {
      const next = clone(prev);
      const goal = next.goals.find((g) => g.id === id);
      if (!goal) return prev;
      Object.assign(goal, patch);
      return next;
    });
  }, []);

  const addReward = useCallback((reward: Omit<Reward, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.rewards.push({ id: Date.now(), ...reward });
      showToast(faCartShopping, `"${reward.name}" added to store!`);
      return next;
    });
  }, [showToast]);

  const removeReward = useCallback((id: number) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      const snapshot = clone(prev);
      const next = clone(prev);
      next.rewards = next.rewards.filter((r) => r.id !== id);
      next.pendingRewards = next.pendingRewards.filter((pr) => pr.rewardId !== id);
      showToast(faTrashCan, `"${reward.name}" removed`, {
        label: 'Undo',
        onClick: () => setState(() => snapshot),
      });
      return next;
    });
  }, [showToast]);

  const saveSetting = useCallback((key: keyof Settings, val: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (key === 'pin') {
        const p = String(val).slice(0, 4);
        next.settings.pin = p || '1234';
      } else if (key === 'childName') {
        next.settings.childName = val.trim() || 'Zack';
      } else if (key === 'foodPts') {
        next.settings.foodPts = Math.max(1, parseInt(val) || 1);
      } else if (key === 'bonusPts') {
        next.settings.bonusPts = Math.max(0, parseInt(val) || 0);
      } else {
        (next.settings[key] as number) = Math.max(0, parseInt(val) || 0);
      }
      return next;
    });
  }, []);

  const resetToday = useCallback(() => {
    setState((prev) => {
      const next = clone(prev);
      next.points = Math.max(0, next.points - next.todayPoints);
      next.totalPoints = Math.max(0, next.totalPoints - next.todayPoints);
      next.todayPoints = 0;
      next.todayFoodCounts = {};
      next.todayGoals = [];
      next.todayGoalCounts = {};
      showToast(faRotate, "Today reset!");
      return next;
    });
  }, [showToast]);

  const resetAll = useCallback(() => {
    // Disconnect from household sync before resetting so the blank state
    // doesn't propagate to all other family devices.
    localStorage.removeItem(HOUSEHOLD_CODE_KEY);
    localStorage.removeItem(SYNC_SKIPPED_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    setState((prev) => {
      const pin = prev.settings.pin;
      const badgeConfig = prev.badgeConfig;
      const next = cloneDefaultState();
      next.settings.pin = pin;
      next.badgeConfig = badgeConfig;
      showToast(faTriangleExclamation, 'Everything reset');
      return applyDayRollover(next);
    });
  }, [showToast]);

  const updateBadgeConfig = useCallback((id: string, key: 'enabled' | 'name' | 'emoji', value: string | boolean) => {
    setState((prev) => {
      const next = clone(prev);
      const cfg = next.badgeConfig[id] || {};
      next.badgeConfig[id] = { ...cfg, [key]: value };
      return next;
    });
  }, []);

  const createHousehold = useCallback(async () => {
    setSyncStatus('syncing');
    const code = generateHouseholdCode();
    try {
      await createHouseholdRow(code, state);
      lastSyncedRef.current = JSON.stringify(state);
      localStorage.setItem(HOUSEHOLD_CODE_KEY, code);
      setHouseholdCode(code);
      setSyncStatus('idle');
      showToast(faCloud, `Cloud sync enabled! Code: ${code}`);
      return code;
    } catch {
      setSyncStatus('error');
      showToast(faCircleXmark, 'Failed to enable cloud sync');
      return null;
    }
  }, [state, showToast]);

  const joinHousehold = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    setSyncStatus('syncing');
    try {
      const remoteState = await fetchHousehold(normalized);
      if (!remoteState) {
        setSyncStatus('error');
        showToast(faCircleXmark, 'Household code not found');
        return false;
      }
      const migrated = clone(remoteState);
      migrateLegacyState(migrated as unknown as Record<string, unknown>);
      lastSyncedRef.current = JSON.stringify(migrated);
      setState(applyDayRollover(migrated));
      localStorage.setItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      showToast(faCloud, 'Joined household sync!');
      return true;
    } catch {
      setSyncStatus('error');
      showToast(faCircleXmark, 'Failed to join household');
      return false;
    }
  }, [showToast]);

  const leaveHousehold = useCallback(() => {
    localStorage.removeItem(HOUSEHOLD_CODE_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    showToast(faCloud, 'Cloud sync turned off');
  }, [showToast]);

  const value: GrubClubContextValue = {
    state,
    toasts,
    celebration,
    confettiTrigger,
    showToast,
    dismissToast,
    hideCelebration,
    logFood,
    removeFood,
    incrementGoal,
    decrementGoal,
    logFoodForDay,
    removeFoodForDay,
    toggleGoalForDay,
    requestReward,
    approveReward,
    declineReward,
    addGoal,
    removeGoal,
    updateGoal,
    addReward,
    removeReward,
    saveSetting,
    resetToday,
    resetAll,
    updateBadgeConfig,
    householdCode,
    syncStatus,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  };

  return <GrubClubContext.Provider value={value}>{children}</GrubClubContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGrubClub(): GrubClubContextValue {
  const ctx = useContext(GrubClubContext);
  if (!ctx) throw new Error('useGrubClub must be used within a GrubClubProvider');
  return ctx;
}
