import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  faStar,
  faListCheck,
} from '@fortawesome/free-solid-svg-icons';
import type { Goal, GravyState, Reward, Settings, Theme } from './types';
import { applyDayRollover, loadState, saveState, cloneDefaultState, migrateLegacyState } from './defaultState';
import { FOODS } from '../data/foods';
import { resolveToastIcon } from '../data/icons';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';
import { getRank, RANKS } from '../data/ranks';
import {
  createHousehold as createHouseholdRow,
  fetchHousehold,
  generateHouseholdCode,
  pushHouseholdState,
  subscribeToHousehold,
} from './sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

const HOUSEHOLD_CODE_KEY = 'gravy_household_code';
export const SYNC_SKIPPED_KEY = 'gravy_sync_skipped';

const THEME_COLORS: Record<Theme, string> = {
  light: '#F7EDE2',
  dark: '#161B1F',
  rainbow: '#F6BD60',
  gold: '#FFFFFF',
};

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

interface GravyContextValue {
  state: GravyState;
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
  logBonusItem: (id: number) => void;
  undoBonusItem: (id: number) => void;
  logFoodForDay: (dateStr: string, foodId: string) => void;
  removeFoodForDay: (dateStr: string, foodId: string) => void;
  toggleGoalForDay: (dateStr: string, goalId: number) => void;
  logBonusItemForDay: (dateStr: string, goalId: number) => void;
  undoBonusItemForDay: (dateStr: string, goalId: number) => void;
  requestReward: (id: number) => void;
  approveReward: (prId: string) => void;
  declineReward: (prId: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  removeGoal: (id: number) => void;
  updateGoal: (id: number, patch: Partial<Omit<Goal, 'id'>>) => void;
  addReward: (reward: Omit<Reward, 'id'>) => void;
  removeReward: (id: number) => void;
  updateReward: (id: number, patch: Partial<Omit<Reward, 'id'>>) => void;
  saveSetting: (key: keyof Settings, val: string) => void;
  resetToday: () => void;
  resetAll: () => void;
  updateBadgeConfig: (id: string, key: 'enabled' | 'name' | 'emoji' | 'icon', value: string | boolean) => void;
  householdCode: string | null;
  syncStatus: SyncStatus;
  createHousehold: () => Promise<string | null>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => void;
}

const GravyContext = createContext<GravyContextValue | null>(null);

function clone(state: GravyState): GravyState {
  return JSON.parse(JSON.stringify(state));
}

let toastIdCounter = 0;

export function GravyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GravyState>(() => loadState());
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

  // Applies the parent-selected theme to the whole app. useLayoutEffect (rather than
  // useEffect) so the attribute is set before paint, avoiding a flash of the light theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[state.settings.theme]);
  }, [state.settings.theme]);

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

  const fireConfetti = useCallback(() => setConfettiTrigger((n) => n + 1), []);

  // Awards (or deducts, for negative pts) points and mutates the given draft state in place
  const awardPoints = useCallback(
    (next: GravyState, pts: number, reason: string, opts?: { silent?: boolean; action?: ToastAction }) => {
      next.points = Math.max(0, next.points + pts);
      next.totalPoints = Math.max(0, next.totalPoints + pts);
      next.todayPoints += pts;
      if (next.todayPoints > (next.counters.maxDayPoints || 0)) {
        next.counters.maxDayPoints = next.todayPoints;
      }
      if (!opts?.silent) {
        const sign = pts < 0 ? '−' : '+';
        showToast(faStar, `${sign}${Math.abs(pts)} ${reason}`.trim(), opts?.action);
      }
    },
    [showToast],
  );

  // Shows a full-screen celebration when totalPoints crosses into a new rank.
  // When delayMs is set, the announcement is deferred so it doesn't collide
  // with a celebration overlay already shown for the same action.
  const maybeCelebrateRankUp = useCallback(
    (prevTotalPoints: number, next: GravyState, delayMs = 0) => {
      const prevIndex = getRank(prevTotalPoints).index;
      const newIndex = getRank(next.totalPoints).index;
      if (newIndex <= prevIndex) return;
      const newRank = RANKS[newIndex];
      const announce = () => showCelebration(resolveToastIcon(newRank.icon, newRank.emoji), 'Rank Up!', `You're now a ${newRank.name}!`);
      if (delayMs > 0) {
        const timer = window.setTimeout(announce, delayMs);
        pendingTimersRef.current.push(timer);
      } else {
        announce();
      }
    },
    [showCelebration],
  );

  // Checks for newly-earned badges and announces them with a confetti burst.
  // When delayMs is set, the announcement is deferred so it doesn't pile up
  // on top of a celebration overlay shown for the same action.
  const checkBadges = useCallback(
    (next: GravyState, delayMs = 0) => {
      const newlyEarned = findNewlyEarnedBadges(next);
      newlyEarned.forEach((id) => {
        next.earnedBadges.push(id);
        const display = getBadgeDisplay(next, id);
        if (display && display.enabled !== false) {
          const announce = () => {
            showToast(resolveToastIcon(display.icon, display.emoji), `Badge unlocked: ${display.name}!`);
            fireConfetti();
          };
          if (delayMs > 0) {
            const timer = window.setTimeout(announce, delayMs);
            pendingTimersRef.current.push(timer);
          } else {
            announce();
          }
        }
      });
    },
    [showToast, fireConfetti],
  );

  const logFood = useCallback((id: string) => {
    setState((prev) => {
      if ((prev.todayFoodCounts[id] || 0) >= 1) return prev;
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
      // Defer badge/rank-up announcements so they don't pile up on top of the celebration overlay.
      const delay = !wasFull && isFull ? 1400 : 0;
      maybeCelebrateRankUp(prev.totalPoints, next, delay);
      checkBadges(next, delay);
      return next;
    });
  }, [awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration]);

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
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = currentCount + 1;
      if (currentCount + 1 >= target && !next.todayGoals.includes(id)) {
        next.todayGoals.push(id);
        next.counters.totalGoals++;
        awardPoints(next, goal.pts, `${goal.name} done!`);
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
  }, [awardPoints, checkBadges, maybeCelebrateRankUp, showCelebration]);

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
        next.points = Math.max(0, next.points - goal.pts);
        next.totalPoints = Math.max(0, next.totalPoints - goal.pts);
        next.todayPoints = Math.max(0, next.todayPoints - goal.pts);
      }
      return next;
    });
  }, []);

  const logBonusItem = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = (next.todayGoalCounts[id] || 0) + 1;
      awardPoints(next, goal.pts, goal.name);
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [awardPoints, maybeCelebrateRankUp]);

  const undoBonusItem = useCallback((id: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal) return prev;
      const currentCount = (prev.todayGoalCounts || {})[id] || 0;
      if (currentCount <= 0) return prev;
      const next = clone(prev);
      if (!next.todayGoalCounts) next.todayGoalCounts = {};
      next.todayGoalCounts[id] = currentCount - 1;
      awardPoints(next, -goal.pts, '', { silent: true });
      return next;
    });
  }, [awardPoints]);

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
      showToast(food ? resolveToastIcon(food.icon, food.emoji) : faUtensils, `${food?.label ?? ''} added!`);
      maybeCelebrateRankUp(prev.totalPoints, next);
      checkBadges(next);
      return next;
    });
  }, [showToast, checkBadges, maybeCelebrateRankUp]);

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
        showToast(resolveToastIcon(goal.icon, goal.emoji), `${goal.name} logged!`);
        maybeCelebrateRankUp(prev.totalPoints, next);
        checkBadges(next);
      }

      return next;
    });
  }, [showToast, checkBadges, maybeCelebrateRankUp]);

  const logBonusItemForDay = useCallback((dateStr: string, goalId: number) => {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;
      const next = clone(prev);
      if (!next.dayLogs[dateStr]) {
        next.dayLogs[dateStr] = { foodCounts: {}, goalIds: [], points: 0, bonusCounts: {} };
      }
      const log = next.dayLogs[dateStr];
      if (!log.bonusCounts) log.bonusCounts = {};
      log.bonusCounts[goalId] = (log.bonusCounts[goalId] || 0) + 1;

      next.points = Math.max(0, next.points + goal.pts);
      next.totalPoints = Math.max(0, next.totalPoints + goal.pts);
      log.points = Math.max(0, log.points + goal.pts);
      if (log.points > (next.counters.maxDayPoints || 0)) {
        next.counters.maxDayPoints = log.points;
      }

      const sign = goal.pts < 0 ? '−' : '+';
      showToast(resolveToastIcon(goal.icon, goal.emoji), `${sign}${Math.abs(goal.pts)} ${goal.name}`);
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [showToast, maybeCelebrateRankUp]);

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
      nextLog.bonusCounts[goalId] = currentCount - 1;

      next.points = Math.max(0, next.points - goal.pts);
      next.totalPoints = Math.max(0, next.totalPoints - goal.pts);
      nextLog.points = Math.max(0, nextLog.points - goal.pts);
      return next;
    });
  }, []);

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

  const updateReward = useCallback((id: number, patch: Partial<Omit<Reward, 'id'>>) => {
    setState((prev) => {
      const next = clone(prev);
      const reward = next.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      Object.assign(reward, patch);
      return next;
    });
  }, []);

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
      } else if (key === 'recoveryQuestion' || key === 'recoveryAnswer') {
        next.settings[key] = val.trim();
      } else if (key === 'theme') {
        if (val === 'light' || val === 'dark' || val === 'rainbow' || val === 'gold') {
          next.settings.theme = val;
        }
      } else if (key === 'avatarIcon') {
        next.settings.avatarIcon = val;
      } else if (key === 'avatarIconColor' || key === 'avatarBgColor') {
        next.settings[key] = val;
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
      const recoveryQuestion = prev.settings.recoveryQuestion;
      const recoveryAnswer = prev.settings.recoveryAnswer;
      const badgeConfig = prev.badgeConfig;
      const next = cloneDefaultState();
      next.settings.pin = pin;
      next.settings.recoveryQuestion = recoveryQuestion;
      next.settings.recoveryAnswer = recoveryAnswer;
      next.badgeConfig = badgeConfig;
      showToast(faTriangleExclamation, 'Everything reset');
      return applyDayRollover(next);
    });
  }, [showToast]);

  const updateBadgeConfig = useCallback((id: string, key: 'enabled' | 'name' | 'emoji' | 'icon', value: string | boolean) => {
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
      showToast(
        faCircleXmark,
        navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
      );
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
      showToast(
        faCircleXmark,
        navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
      );
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

  const value: GravyContextValue = {
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
    logBonusItem,
    undoBonusItem,
    logFoodForDay,
    removeFoodForDay,
    toggleGoalForDay,
    logBonusItemForDay,
    undoBonusItemForDay,
    requestReward,
    approveReward,
    declineReward,
    addGoal,
    removeGoal,
    updateGoal,
    addReward,
    removeReward,
    updateReward,
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

  return <GravyContext.Provider value={value}>{children}</GravyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGravy(): GravyContextValue {
  const ctx = useContext(GravyContext);
  if (!ctx) throw new Error('useGravy must be used within a GravyProvider');
  return ctx;
}
