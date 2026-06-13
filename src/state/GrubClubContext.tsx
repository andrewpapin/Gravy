import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Chore, GrubClubState, Reward, Settings } from './types';
import { applyDayRollover, loadState, saveState, cloneDefaultState } from './defaultState';
import { FOODS } from '../data/foods';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';

export interface ToastItem {
  id: number;
  icon: string;
  msg: string;
}

export interface CelebrationData {
  icon: string;
  title: string;
  sub: string;
}

interface GrubClubContextValue {
  state: GrubClubState;
  toasts: ToastItem[];
  celebration: CelebrationData | null;
  confettiTrigger: number;
  dismissToast: (id: number) => void;
  hideCelebration: () => void;
  toggleFood: (id: string) => void;
  toggleChore: (id: number) => void;
  requestReward: (id: number) => void;
  approveReward: (prId: string) => void;
  declineReward: (prId: string) => void;
  addChore: (chore: Omit<Chore, 'id'>) => void;
  removeChore: (id: number) => void;
  addReward: (reward: Omit<Reward, 'id'>) => void;
  removeReward: (id: number) => void;
  saveSetting: (key: keyof Settings, val: string) => void;
  resetToday: () => void;
  resetAll: () => void;
  updateBadgeConfig: (id: string, key: 'enabled' | 'name' | 'emoji', value: string | boolean) => void;
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

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  const showToast = useCallback((icon: string, msg: string) => {
    const id = ++toastIdCounter;
    setToasts((t) => [...t, { id, icon, msg }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const showCelebration = useCallback((icon: string, title: string, sub: string) => {
    setCelebration({ icon, title, sub });
    setConfettiTrigger((n) => n + 1);
  }, []);

  const hideCelebration = useCallback(() => setCelebration(null), []);

  // Awards points and mutates the given draft state in place
  const awardPoints = useCallback(
    (next: GrubClubState, pts: number, reason: string) => {
      next.points += pts;
      next.totalPoints += pts;
      next.todayPoints += pts;
      if (next.todayPoints > (next.counters.maxDayPoints || 0)) {
        next.counters.maxDayPoints = next.todayPoints;
      }
      showToast(`+${pts} ⭐`, reason || '');
    },
    [showToast],
  );

  const checkBadges = useCallback(
    (next: GrubClubState) => {
      const newlyEarned = findNewlyEarnedBadges(next);
      newlyEarned.forEach((id) => {
        next.earnedBadges.push(id);
        const display = getBadgeDisplay(next, id);
        if (display && display.enabled !== false) {
          showToast(display.emoji, `Badge unlocked: ${display.name}!`);
        }
      });
    },
    [showToast],
  );

  const toggleFood = useCallback((id: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (next.todayFoods.includes(id)) {
        const wasFull = FOODS.every((f) => next.todayFoods.includes(f.id));
        next.todayFoods = next.todayFoods.filter((f) => f !== id);
        next.points = Math.max(0, next.points - next.settings.foodPts);
        next.totalPoints = Math.max(0, next.totalPoints - next.settings.foodPts);
        next.todayPoints = Math.max(0, next.todayPoints - next.settings.foodPts);
        next.counters.foodLogs[id] = Math.max(0, (next.counters.foodLogs[id] || 0) - 1);
        if (wasFull && next.settings.bonusPts > 0) {
          next.points = Math.max(0, next.points - next.settings.bonusPts);
          next.totalPoints = Math.max(0, next.totalPoints - next.settings.bonusPts);
          next.todayPoints = Math.max(0, next.todayPoints - next.settings.bonusPts);
          next.counters.fullTrayDays = Math.max(0, next.counters.fullTrayDays - 1);
        }
        return next;
      }
      next.todayFoods.push(id);
      next.counters.foodLogs[id] = (next.counters.foodLogs[id] || 0) + 1;
      const food = FOODS.find((f) => f.id === id);
      awardPoints(next, next.settings.foodPts, `${food?.label ?? ''} logged!`);

      if (FOODS.every((f) => next.todayFoods.includes(f.id))) {
        next.counters.fullTrayDays++;
        if (next.settings.bonusPts > 0) {
          awardPoints(next, next.settings.bonusPts, '🎉 Full Tray Bonus!');
        }
        const allChoresDone = next.chores.length > 0 && next.chores.every((c) => next.todayChores.includes(c.id));
        if (allChoresDone) next.counters.comboDays++;
        showCelebration('🍽️', 'Full Tray!', `All 5 food groups eaten! +${next.settings.bonusPts} bonus!`);
      }
      checkBadges(next);
      return next;
    });
  }, [awardPoints, checkBadges, showCelebration]);

  const toggleChore = useCallback((id: number) => {
    setState((prev) => {
      const chore = prev.chores.find((c) => c.id === id);
      if (!chore) return prev;
      const next = clone(prev);
      if (next.todayChores.includes(id)) {
        next.todayChores = next.todayChores.filter((c) => c !== id);
        next.points = Math.max(0, next.points - chore.pts);
        next.totalPoints = Math.max(0, next.totalPoints - chore.pts);
        next.todayPoints = Math.max(0, next.todayPoints - chore.pts);
        next.counters.totalChores = Math.max(0, next.counters.totalChores - 1);
        return next;
      }
      next.todayChores.push(id);
      next.counters.totalChores++;
      awardPoints(next, chore.pts, `${chore.name} done!`);
      if (next.chores.length > 0 && next.chores.every((c) => next.todayChores.includes(c.id))) {
        next.counters.allChoresDays++;
        const fullTray = FOODS.every((f) => next.todayFoods.includes(f.id));
        if (fullTray) next.counters.comboDays++;
      }
      checkBadges(next);
      return next;
    });
  }, [awardPoints, checkBadges]);

  const requestReward = useCallback((id: number) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === id);
      if (!reward) return prev;
      if (prev.points < reward.cost) {
        showToast('❌', `Need ${reward.cost - prev.points} more points!`);
        return prev;
      }
      const next = clone(prev);
      const pr = { id: Date.now().toString(), rewardId: id };
      next.pendingRewards.push(pr);
      next.counters.totalRewards++;
      showToast('📬', `${reward.name} requested!`);
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
        showToast('✅', `${reward.name} approved!`);
      }
      return next;
    });
  }, [showToast]);

  const declineReward = useCallback((prId: string) => {
    setState((prev) => {
      const next = clone(prev);
      next.pendingRewards = next.pendingRewards.filter((p) => p.id !== prId);
      showToast('❌', 'Request declined');
      return next;
    });
  }, [showToast]);

  const addChore = useCallback((chore: Omit<Chore, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.chores.push({ id: Date.now(), ...chore });
      showToast('✅', `"${chore.name}" added!`);
      return next;
    });
  }, [showToast]);

  const removeChore = useCallback((id: number) => {
    setState((prev) => {
      const next = clone(prev);
      next.chores = next.chores.filter((c) => c.id !== id);
      next.todayChores = next.todayChores.filter((c) => c !== id);
      return next;
    });
  }, []);

  const addReward = useCallback((reward: Omit<Reward, 'id'>) => {
    setState((prev) => {
      const next = clone(prev);
      next.rewards.push({ id: Date.now(), ...reward });
      showToast('🛒', `"${reward.name}" added to store!`);
      return next;
    });
  }, [showToast]);

  const removeReward = useCallback((id: number) => {
    setState((prev) => {
      const next = clone(prev);
      next.rewards = next.rewards.filter((r) => r.id !== id);
      next.pendingRewards = next.pendingRewards.filter((pr) => pr.rewardId !== id);
      return next;
    });
  }, []);

  const saveSetting = useCallback((key: keyof Settings, val: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (key === 'pin') {
        const p = String(val).slice(0, 4);
        next.settings.pin = p || '1234';
      } else {
        (next.settings[key] as number) = parseInt(val) || 0;
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
      next.todayFoods = [];
      next.todayChores = [];
      showToast('🔄', "Today reset!");
      return next;
    });
  }, [showToast]);

  const resetAll = useCallback(() => {
    setState((prev) => {
      const pin = prev.settings.pin;
      const badgeConfig = prev.badgeConfig;
      const next = cloneDefaultState();
      next.settings.pin = pin;
      next.badgeConfig = badgeConfig;
      showToast('⚠️', 'Everything reset');
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

  const value: GrubClubContextValue = {
    state,
    toasts,
    celebration,
    confettiTrigger,
    dismissToast,
    hideCelebration,
    toggleFood,
    toggleChore,
    requestReward,
    approveReward,
    declineReward,
    addChore,
    removeChore,
    addReward,
    removeReward,
    saveSetting,
    resetToday,
    resetAll,
    updateBadgeConfig,
  };

  return <GrubClubContext.Provider value={value}>{children}</GrubClubContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGrubClub(): GrubClubContextValue {
  const ctx = useContext(GrubClubContext);
  if (!ctx) throw new Error('useGrubClub must be used within a GrubClubProvider');
  return ctx;
}
