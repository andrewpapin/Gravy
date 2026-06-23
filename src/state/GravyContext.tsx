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
  faUserPlus,
  faGamepad,
} from '@fortawesome/free-solid-svg-icons';
import type { DayLog, Goal, GravyRoot, GravyState, ProfileEntry, Reward, Settings, Theme } from './types';
import {
  applyDayRollover,
  cloneDefaultState,
  backfillStreaksFromLogs,
  loadRoot,
  saveRoot,
  hydrateState,
  mirrorSharedFields,
  makeNewProfile,
} from './defaultState';
import { FOODS } from '../data/foods';
import { resolveToastIcon } from '../data/icons';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';
import { applyAward, applyAwardForDay, applyBonusItem, applyBonusItemForDay, reverseBonusItem } from './points';
import { getRank, RANKS } from '../data/ranks';
import { GAMES } from '../data/games';
import { hashWithSalt, randomSaltHex } from './hash';
import {
  createHousehold as createHouseholdRow,
  deleteHousehold as deleteHouseholdRow,
  fetchHousehold,
  generateHouseholdCode,
  isValidHouseholdCode,
  pushHouseholdState,
  renameHousehold as renameHouseholdRow,
  subscribeToHousehold,
} from './sync';
import { safeGetItem, safeRemoveItem, safeSetItem } from './storage';

export type SyncStatus = 'idle' | 'syncing' | 'error';

const HOUSEHOLD_CODE_KEY = 'gravy_household_code';
export const SYNC_SKIPPED_KEY = 'gravy_sync_skipped';
// Caps how many game wins count toward points per day, so a kid can't farm an easy
// round on repeat — beyond this, wins still feel celebratory but stop paying out.
export const DAILY_GAME_WIN_CAP = 3;

const THEME_COLORS: Record<Theme, string> = {
  classic: '#f4ece4',
  midnight: '#1e1e24',
  ocean: '#e0f7fa',
  bubblegum: '#ffe5ec',
  cyberpunk: '#fcee0a',
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

export interface ProfileSummary {
  id: string;
  name: string;
  avatarIcon: string;
  avatarIconColor: string;
  avatarBgColor: string;
  theme: Theme;
  points: number;
}

// Per-kid identity fields a parent can edit for any profile.
export type ProfilePatch = Partial<
  Pick<Settings, 'childName' | 'avatarIcon' | 'avatarIconColor' | 'avatarBgColor' | 'theme'>
>;

// pinHash/pinSalt/recoveryAnswerHash/recoveryAnswerSalt are internal-only — callers set the PIN
// or recovery answer via the virtual 'pin'/'recoveryAnswer' keys, never the hash/salt fields directly.
type SettableSettingKey = Exclude<keyof Settings, 'pinHash' | 'pinSalt' | 'recoveryAnswerHash' | 'recoveryAnswerSalt'> | 'pin' | 'recoveryAnswer';

interface GravyContextValue {
  state: GravyState;
  profiles: ProfileSummary[];
  activeProfileId: string;
  switchProfile: (id: string) => void;
  addProfile: (name: string, opts?: ProfilePatch & { switchTo?: boolean }) => void;
  updateProfile: (id: string, patch: ProfilePatch) => void;
  deleteProfile: (id: string) => void;
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
  completeGameRound: (gameId: string, won: boolean) => void;
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
  saveSetting: (key: SettableSettingKey, val: string) => void;
  resetToday: () => void;
  resetAll: () => void;
  updateBadgeConfig: (id: string, key: 'enabled' | 'name' | 'emoji' | 'icon', value: string | boolean) => void;
  householdCode: string | null;
  syncStatus: SyncStatus;
  createHousehold: (customCode?: string) => Promise<string | null>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => void;
  deleteHouseholdEverywhere: () => Promise<boolean>;
  changeHouseholdCode: (newCode: string) => Promise<boolean>;
}

const GravyContext = createContext<GravyContextValue | null>(null);

function clone(state: GravyState): GravyState {
  return JSON.parse(JSON.stringify(state));
}

// Folds the live active-profile state back into the root and re-mirrors the shared config across
// every profile. The single source of truth for the active kid is the `state` useState; the rest
// of the root carries the other profiles. This is the canonical shape we persist and sync.
function buildMergedRoot(root: GravyRoot, activeState: GravyState): GravyRoot {
  const merged: GravyRoot = {
    version: 2,
    activeProfileId: root.activeProfileId,
    profiles: root.profiles.map((p) =>
      p.id === root.activeProfileId ? { id: p.id, state: activeState } : p,
    ),
  };
  mirrorSharedFields(merged);
  return merged;
}

function activeStateOf(root: GravyRoot): GravyState {
  const entry = root.profiles.find((p) => p.id === root.activeProfileId) || root.profiles[0];
  return entry.state;
}

let toastIdCounter = 0;

export function GravyProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<GravyRoot>(() => loadRoot());
  const [state, setState] = useState<GravyState>(() => activeStateOf(root));
  // Latest values read by the imperative profile actions without stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rootRef = useRef(root);
  rootRef.current = root;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [householdCode, setHouseholdCode] = useState<string | null>(() =>
    safeGetItem(HOUSEHOLD_CODE_KEY),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const lastSyncedRef = useRef<string | null>(null);
  const pendingTimersRef = useRef<number[]>([]);
  const storageWarnedRef = useRef(false);

  // Applies the parent-selected theme to the whole app. useLayoutEffect (rather than
  // useEffect) so the attribute is set before paint, avoiding a flash of the light theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[state.settings.theme]);
  }, [state.settings.theme]);

  // Push local changes to Supabase when in a synced household. The whole root (all profiles +
  // shared config) is the synced payload, so every device shares every kid.
  useEffect(() => {
    if (!householdCode) return;
    const merged = buildMergedRoot(root, state);
    const json = JSON.stringify(merged);
    if (json === lastSyncedRef.current) return;
    setSyncStatus('syncing');
    const timeout = setTimeout(() => {
      pushHouseholdState(householdCode, merged)
        .then(() => {
          lastSyncedRef.current = json;
          setSyncStatus('idle');
        })
        .catch(() => setSyncStatus('error'));
    }, 800);
    return () => clearTimeout(timeout);
  }, [state, root, householdCode]);

  // Receive remote changes from other devices in the household
  useEffect(() => {
    if (!householdCode) return;
    return subscribeToHousehold(householdCode, (remoteRoot) => {
      try {
        const incomingJson = JSON.stringify(remoteRoot);
        if (incomingJson === lastSyncedRef.current) return;
        const profiles: ProfileEntry[] = (remoteRoot.profiles || [])
          .filter((p) => p && p.state)
          .map((p) => ({ id: p.id, state: hydrateState(p.state) }));
        if (profiles.length === 0) return;
        const finalRoot: GravyRoot = {
          version: 2,
          activeProfileId: profiles.some((p) => p.id === remoteRoot.activeProfileId)
            ? remoteRoot.activeProfileId
            : profiles[0].id,
          profiles,
        };
        mirrorSharedFields(finalRoot);
        // Record the snapshot we're actually storing (post migration + rollover) so the
        // outgoing-push effect treats it as already-synced and doesn't echo it straight back.
        lastSyncedRef.current = JSON.stringify(finalRoot);
        setRoot(finalRoot);
        setState(activeStateOf(finalRoot));
      } catch {
        // Ignore malformed realtime payloads rather than crashing the whole app.
      }
    });
  }, [householdCode]);

  // Re-check the day rollover whenever the tab regains focus — for every profile, not just the
  // active one, so a kid not opened in days still has correct streaks/cleared "today" when picked.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setState((s) => applyDayRollover(clone(s)));
        setRoot((r) => ({
          ...r,
          profiles: r.profiles.map((p) =>
            p.id === r.activeProfileId ? p : { id: p.id, state: applyDayRollover(clone(p.state)) },
          ),
        }));
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

  // Persist on every state/root change. localStorage can throw (quota exceeded, or storage
  // disabled in private browsing) — warn once via toast rather than silently losing the
  // kid's progress, but don't re-show it on every subsequent failed write.
  useEffect(() => {
    const saved = saveRoot(buildMergedRoot(root, state));
    if (saved) {
      storageWarnedRef.current = false;
    } else if (!storageWarnedRef.current) {
      storageWarnedRef.current = true;
      showToast(faTriangleExclamation, "Couldn't save — this device's storage is full or unavailable");
    }
  }, [state, root, showToast]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const showCelebration = useCallback((icon: IconDefinition | string, title: string, sub: string) => {
    setCelebration({ icon, title, sub });
    setConfettiTrigger((n) => n + 1);
  }, []);

  const hideCelebration = useCallback(() => setCelebration(null), []);

  const fireConfetti = useCallback(() => setConfettiTrigger((n) => n + 1), []);

  // Awards points and mutates the given draft state in place. Used for the positive flows
  // (food, daily goals, full-tray bonus) and their exact-inverse removals; the running
  // balance is intentionally NOT floored here so an award and its later removal cancel out
  // precisely (flooring would let a kid re-log an item they'd already spent to mint points).
  // Bonus-item penalties are handled separately in logBonusItem, where they're forgiven once
  // the balance hits zero. Negative balances are floored only where they're displayed
  // (TopBar / rank) and where they're spent (approveReward).
  const awardPoints = useCallback(
    (next: GravyState, pts: number, reason: string, opts?: { silent?: boolean; action?: ToastAction }) => {
      applyAward(next, pts);
      if (!opts?.silent) {
        const sign = pts < 0 ? '−' : '+';
        showToast(faStar, `${sign}${Math.abs(pts)} ${reason}`.trim(), opts?.action);
      }
    },
    [showToast],
  );

  // Same as awardPoints, but for editing a past day from the Calendar (parent dashboard,
  // PIN-gated): targets that day's own log.points instead of todayPoints, while still
  // moving the live balance/lifetime total exactly like editing today does.
  const awardPointsForDay = useCallback(
    (next: GravyState, log: DayLog, pts: number, reason: string, opts?: { silent?: boolean }) => {
      applyAwardForDay(next, log, pts);
      if (!opts?.silent) {
        const sign = pts < 0 ? '−' : '+';
        showToast(faStar, `${sign}${Math.abs(pts)} ${reason}`.trim());
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

      // Undo restores the full pre-tap snapshot. If another action happens before the toast
      // expires, tapping Undo reverts to this moment (standard single-step undo, not a stack).
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
        // Exact inverse of incrementGoal's award (see awardPoints note) — no zero-floor here.
        next.points -= goal.pts;
        next.totalPoints -= goal.pts;
        next.todayPoints -= goal.pts;
      }
      return next;
    });
  }, []);

  const completeGameRound = useCallback((gameId: string, won: boolean) => {
    setState((prev) => {
      const next = clone(prev);
      next.counters.gamesPlayed++;
      if (won) {
        next.counters.gamesWon++;
        const game = GAMES.find((g) => g.id === gameId);
        if (next.todayGameWins < DAILY_GAME_WIN_CAP) {
          next.todayGameWins++;
          awardPoints(next, next.settings.gamePts, `🎉 ${game?.name ?? 'Game'} win!`);
        } else {
          showToast(faGamepad, "Nice win! Today's game points are maxed — keep playing for fun!");
        }
        maybeCelebrateRankUp(prev.totalPoints, next);
        checkBadges(next);
      }
      return next;
    });
  }, [awardPoints, checkBadges, maybeCelebrateRankUp, showToast]);

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
      maybeCelebrateRankUp(prev.totalPoints, next);
      return next;
    });
  }, [showToast, maybeCelebrateRankUp]);

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
      return next;
    });
  }, []);

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
      awardPointsForDay(next, log, next.settings.foodPts, `${food?.label ?? ''} added!`);

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
  }, [awardPointsForDay, checkBadges, maybeCelebrateRankUp]);

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

      backfillStreaksFromLogs(next);
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
        // Exact inverse of the "complete" branch's award below (see awardPoints note) —
        // no zero-floor here, so toggling back off lands back exactly where it started.
        next.points -= goal.pts;
        next.totalPoints -= goal.pts;
        log.points -= goal.pts;
        if (wasAllGoalsDone) {
          next.counters.allGoalsDays = Math.max(0, next.counters.allGoalsDays - 1);
          if (fullTray) next.counters.comboDays = Math.max(0, next.counters.comboDays - 1);
        }
      } else {
        log.goalIds.push(goalId);
        next.counters.totalGoals++;
        // Editing a past day from the Calendar (now PIN-gated under Grown-Ups) flows into
        // the live balance/lifetime total exactly like completing the goal today does.
        awardPointsForDay(next, log, goal.pts, `${goal.name} logged!`);
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
  }, [awardPointsForDay, checkBadges, maybeCelebrateRankUp]);

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
      if (!nextLog.bonusApplied) nextLog.bonusApplied = {};
      nextLog.bonusCounts[goalId] = currentCount - 1;

      const net = nextLog.bonusApplied[goalId] || 0;
      const reverse = reverseBonusItem(net, goal.pts);
      next.points += reverse;
      next.totalPoints += reverse;
      nextLog.points += reverse;
      nextLog.bonusApplied[goalId] = net + reverse;
      return next;
    });
  }, []);

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
        const shortfall = reward.cost - next.points;
        next.points = Math.max(0, next.points - reward.cost);
        if (shortfall > 0) {
          showToast(faTriangleExclamation, `${reward.name} approved — balance was short by ${shortfall} pts`);
        } else {
          showToast(faCircleCheck, `${reward.name} approved!`);
        }
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
      const isDailyChanged = 'isDaily' in patch && (patch.isDaily !== false) !== (goal.isDaily !== false);
      Object.assign(goal, patch);
      // Flipping a goal between Daily and Bonus changes how its today-state is interpreted,
      // so drop any in-progress completion/step counts to avoid a phantom carried-over state.
      if (isDailyChanged) {
        next.todayGoals = next.todayGoals.filter((g) => g !== id);
        if (next.todayGoalCounts) delete next.todayGoalCounts[id];
        if (goal.isDaily === false) goal.target = undefined;
      }
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

  const saveSetting = useCallback((key: SettableSettingKey, val: string) => {
    setState((prev) => {
      const next = clone(prev);
      if (key === 'pin') {
        const p = String(val).slice(0, 4) || '1234';
        const salt = randomSaltHex();
        next.settings.pinHash = hashWithSalt(p, salt);
        next.settings.pinSalt = salt;
      } else if (key === 'recoveryAnswer') {
        const answer = val.trim().toLowerCase();
        if (answer) {
          const salt = randomSaltHex();
          next.settings.recoveryAnswerHash = hashWithSalt(answer, salt);
          next.settings.recoveryAnswerSalt = salt;
        } else {
          next.settings.recoveryAnswerHash = '';
          next.settings.recoveryAnswerSalt = '';
        }
      } else if (key === 'childName') {
        next.settings.childName = val.trim() || 'Zack';
      } else if (key === 'foodPts') {
        next.settings.foodPts = Math.max(1, parseInt(val) || 1);
      } else if (key === 'bonusPts') {
        next.settings.bonusPts = Math.max(0, parseInt(val) || 0);
      } else if (key === 'recoveryQuestion') {
        next.settings.recoveryQuestion = val.trim();
      } else if (key === 'theme') {
        if (val === 'classic' || val === 'midnight' || val === 'ocean' || val === 'bubblegum' || val === 'cyberpunk') {
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
      next.todayBonusApplied = {};
      showToast(faRotate, "Today reset!");
      return next;
    });
  }, [showToast]);

  const resetAll = useCallback(() => {
    // Cancel any deferred celebration/badge toasts queued by an action just before the
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
      const badgeConfig = prev.badgeConfig;
      const next = cloneDefaultState();
      // "Reset Everything" wipes progress (points, badges, history, goals, rewards) but
      // keeps account + personalization settings — security and the kid's name/look.
      next.settings.pinHash = prev.settings.pinHash;
      next.settings.pinSalt = prev.settings.pinSalt;
      next.settings.recoveryQuestion = prev.settings.recoveryQuestion;
      next.settings.recoveryAnswerHash = prev.settings.recoveryAnswerHash;
      next.settings.recoveryAnswerSalt = prev.settings.recoveryAnswerSalt;
      next.settings.childName = prev.settings.childName;
      next.settings.theme = prev.settings.theme;
      next.settings.avatarIcon = prev.settings.avatarIcon;
      next.settings.avatarIconColor = prev.settings.avatarIconColor;
      next.settings.avatarBgColor = prev.settings.avatarBgColor;
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

  const switchProfile = useCallback((id: string) => {
    const prevRoot = rootRef.current;
    if (id === prevRoot.activeProfileId || !prevRoot.profiles.some((p) => p.id === id)) return;
    const merged = buildMergedRoot(prevRoot, stateRef.current);
    const target = merged.profiles.find((p) => p.id === id)!;
    const rolled = applyDayRollover(clone(target.state));
    setRoot({
      ...merged,
      activeProfileId: id,
      profiles: merged.profiles.map((p) => (p.id === id ? { id, state: rolled } : p)),
    });
    setState(rolled);
  }, []);

  const addProfile = useCallback(
    (name: string, opts?: ProfilePatch & { switchTo?: boolean }) => {
      const merged = buildMergedRoot(rootRef.current, stateRef.current);
      const entry = makeNewProfile(name, stateRef.current, {
        avatarIcon: opts?.avatarIcon,
        avatarIconColor: opts?.avatarIconColor,
        avatarBgColor: opts?.avatarBgColor,
        theme: opts?.theme,
      });
      const switchTo = opts?.switchTo ?? false;
      setRoot({
        ...merged,
        profiles: [...merged.profiles, entry],
        activeProfileId: switchTo ? entry.id : merged.activeProfileId,
      });
      if (switchTo) setState(entry.state);
      showToast(faUserPlus, `Added ${entry.state.settings.childName}`);
    },
    [showToast],
  );

  const updateProfile = useCallback((id: string, patch: ProfilePatch) => {
    if (id === rootRef.current.activeProfileId) {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    } else {
      setRoot((r) => ({
        ...r,
        profiles: r.profiles.map((p) =>
          p.id === id
            ? { id: p.id, state: { ...p.state, settings: { ...p.state.settings, ...patch } } }
            : p,
        ),
      }));
    }
  }, []);

  const deleteProfile = useCallback(
    (id: string) => {
      const prevRoot = rootRef.current;
      if (prevRoot.profiles.length <= 1) return; // never delete the last profile
      const merged = buildMergedRoot(prevRoot, stateRef.current);
      const removed = merged.profiles.find((p) => p.id === id);
      const remaining = merged.profiles.filter((p) => p.id !== id);
      const wasActive = id === merged.activeProfileId;
      let nextState = stateRef.current;
      if (wasActive) {
        nextState = applyDayRollover(clone(remaining[0].state));
        remaining[0] = { id: remaining[0].id, state: nextState };
      }
      setRoot({
        ...merged,
        profiles: remaining,
        activeProfileId: wasActive ? remaining[0].id : merged.activeProfileId,
      });
      if (wasActive) setState(nextState);
      if (removed) showToast(faTrashCan, `Deleted ${removed.state.settings.childName}`);
    },
    [showToast],
  );

  const createHousehold = useCallback(async (customCode?: string) => {
    if (customCode) {
      const normalized = customCode.trim().toUpperCase();
      if (!isValidHouseholdCode(normalized)) {
        showToast(faCircleXmark, 'Code must be 6 letters/numbers (no 0, O, 1, or I)');
        return null;
      }
      setSyncStatus('syncing');
      try {
        const merged = buildMergedRoot(rootRef.current, stateRef.current);
        await createHouseholdRow(normalized, merged);
        lastSyncedRef.current = JSON.stringify(merged);
        safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
        setHouseholdCode(normalized);
        setSyncStatus('idle');
        showToast(faCloud, `Cloud sync enabled! Code: ${normalized}`);
        return normalized;
      } catch (err) {
        setSyncStatus('error');
        if ((err as { code?: string }).code === '23505') {
          showToast(faCircleXmark, 'That code is already taken — try another');
        } else {
          showToast(
            faCircleXmark,
            navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
          );
        }
        return null;
      }
    }
    setSyncStatus('syncing');
    // Codes are random, but on the off chance one already exists the insert hits the
    // primary-key constraint (Postgres 23505) — regenerate and retry a few times rather
    // than failing the whole sync setup.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateHouseholdCode();
      try {
        const merged = buildMergedRoot(rootRef.current, stateRef.current);
        await createHouseholdRow(code, merged);
        lastSyncedRef.current = JSON.stringify(merged);
        safeSetItem(HOUSEHOLD_CODE_KEY, code);
        setHouseholdCode(code);
        setSyncStatus('idle');
        showToast(faCloud, `Cloud sync enabled! Code: ${code}`);
        return code;
      } catch (err) {
        if ((err as { code?: string }).code === '23505' && attempt < 4) continue;
        setSyncStatus('error');
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
        return null;
      }
    }
    return null;
  }, [showToast]);

  const joinHousehold = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    setSyncStatus('syncing');
    try {
      const remoteRoot = await fetchHousehold(normalized);
      if (!remoteRoot) {
        setSyncStatus('error');
        showToast(faCircleXmark, 'Household code not found');
        return false;
      }
      const profiles: ProfileEntry[] = (remoteRoot.profiles || [])
        .filter((p) => p && p.state)
        .map((p) => ({ id: p.id, state: hydrateState(p.state) }));
      if (profiles.length === 0) {
        setSyncStatus('error');
        showToast(faCircleXmark, 'Household code not found');
        return false;
      }
      const finalRoot: GravyRoot = {
        version: 2,
        activeProfileId: profiles.some((p) => p.id === remoteRoot.activeProfileId)
          ? remoteRoot.activeProfileId
          : profiles[0].id,
        profiles,
      };
      mirrorSharedFields(finalRoot);
      lastSyncedRef.current = JSON.stringify(finalRoot);
      setRoot(finalRoot);
      setState(activeStateOf(finalRoot));
      safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      showToast(faCloud, 'Joined household sync!');
      return true;
    } catch (err) {
      setSyncStatus('error');
      const message = (err as { message?: string }).message;
      if (message?.startsWith('Too many attempts')) {
        showToast(faCircleXmark, message);
      } else {
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
      }
      return false;
    }
  }, [showToast]);

  const leaveHousehold = useCallback(() => {
    // Cancel any deferred celebration/badge toasts queued just before disconnecting — they'd
    // otherwise still fire afterward, referencing a state snapshot from the now-disconnected sync.
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    safeRemoveItem(HOUSEHOLD_CODE_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    showToast(faCloud, 'Cloud sync turned off');
  }, [showToast]);

  // Unlike leaveHousehold (which only disconnects this device), this deletes the household
  // row server-side — every other device synced to this code loses access to it too.
  const deleteHouseholdEverywhere = useCallback(async () => {
    if (!householdCode) return false;
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    setSyncStatus('syncing');
    try {
      await deleteHouseholdRow(householdCode);
      safeRemoveItem(HOUSEHOLD_CODE_KEY);
      setHouseholdCode(null);
      lastSyncedRef.current = null;
      setSyncStatus('idle');
      showToast(faTrashCan, 'Household deleted everywhere');
      return true;
    } catch {
      setSyncStatus('error');
      showToast(
        faCircleXmark,
        navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
      );
      return false;
    }
  }, [householdCode, showToast]);

  const changeHouseholdCode = useCallback(async (newCode: string) => {
    const normalized = newCode.trim().toUpperCase();
    if (!isValidHouseholdCode(normalized)) {
      showToast(faCircleXmark, 'Code must be 6 letters/numbers (no 0, O, 1, or I)');
      return false;
    }
    if (!householdCode || normalized === householdCode) return true;
    setSyncStatus('syncing');
    try {
      await renameHouseholdRow(householdCode, normalized);
      safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      showToast(faCloud, `Sync code changed to ${normalized}`);
      return true;
    } catch (err) {
      setSyncStatus('error');
      if ((err as { code?: string }).code === '23505') {
        showToast(faCircleXmark, 'That code is already taken — try another');
      } else {
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
      }
      return false;
    }
  }, [householdCode, showToast]);

  // The active kid's identity comes from the live `state`; the others from the root.
  const profiles: ProfileSummary[] = root.profiles.map((p) => {
    const s = p.id === root.activeProfileId ? state : p.state;
    return {
      id: p.id,
      name: s.settings.childName,
      avatarIcon: s.settings.avatarIcon,
      avatarIconColor: s.settings.avatarIconColor,
      avatarBgColor: s.settings.avatarBgColor,
      theme: s.settings.theme,
      points: s.points,
    };
  });

  const value: GravyContextValue = {
    state,
    profiles,
    activeProfileId: root.activeProfileId,
    switchProfile,
    addProfile,
    updateProfile,
    deleteProfile,
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
    completeGameRound,
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
    deleteHouseholdEverywhere,
    changeHouseholdCode,
  };

  return <GravyContext.Provider value={value}>{children}</GravyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGravy(): GravyContextValue {
  const ctx = useContext(GravyContext);
  if (!ctx) throw new Error('useGravy must be used within a GravyProvider');
  return ctx;
}
