import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faTriangleExclamation, faStar } from '@fortawesome/free-solid-svg-icons';
import type { ActionLogEntry, DayLog, Goal, GravyRoot, GravyState, Reward, Theme } from './types';
import {
  applyDayRollover,
  loadRoot,
  saveRoot,
} from './defaultState';
import { resolveToastIcon } from '../data/icons';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';
import { applyAward, applyAwardForDay } from './points';
import { getRank, RANKS } from '../data/ranks';
import {
  type AuthResult,
  type AuthUser,
  type HouseholdStatus,
  isGrownUpUnlocked,
} from './auth';
import { SYNC_SKIPPED_KEY, DAILY_GAME_WIN_CAP, activeStateOf, buildMergedRoot, clone } from './actions/shared';
import type { ProfilePatch, SettableSettingKey, SyncStatus } from './actions/types';
import { useHouseholdSync } from './useHouseholdSync';
import { useKidProgressActions } from './actions/useKidProgressActions';
import { useDayEditActions } from './actions/useDayEditActions';
import { useRewardActions } from './actions/useRewardActions';
import { usePendingPointsActions } from './actions/usePendingPointsActions';
import { useCatalogActions } from './actions/useCatalogActions';
import { useProfileActions } from './actions/useProfileActions';
import { useHouseholdActions } from './actions/useHouseholdActions';

// Re-exported here so existing consumers (Onboarding, SyncGateModal, GamesScreen) keep their
// import path; the source of truth now lives in ./actions/shared.
export { SYNC_SKIPPED_KEY, DAILY_GAME_WIN_CAP };
export type { SyncStatus };

const THEME_COLORS: Record<Theme, string> = {
  capri: '#f0ede6',
  classic: '#f4ece4',
  midnight: '#1e1e24',
  ocean: '#e0f7fa',
  bubblegum: '#ffe5ec',
  cyberpunk: '#fcee0a',
  ranger: '#f1eef4',
};

export interface ToastItem {
  id: number;
  icon: IconDefinition | string;
  msg: string;
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
  showToast: (icon: IconDefinition | string, msg: string) => void;
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
  undoActionLogEntry: (entry: ActionLogEntry) => void;
  requestReward: (id: number) => void;
  approveReward: (prId: string) => void;
  declineReward: (prId: string) => void;
  approvePendingPointsAward: (id: string) => void;
  declinePendingPointsAward: (id: string) => void;
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
  // The sole gate for parental-control screens — derived from authUser + householdStatus, not
  // stored. See src/state/auth.ts#isGrownUpUnlocked.
  grownUpUnlocked: boolean;
  householdCode: string | null;
  syncStatus: SyncStatus;
  createHousehold: (customCode?: string) => Promise<string | null>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => void;
  deleteHouseholdEverywhere: () => Promise<boolean>;
  changeHouseholdCode: (newCode: string) => Promise<boolean>;
  // --- Parent account (Epic 8) ---
  authUser: AuthUser | null;
  authReady: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  sendSignInLink: (email: string) => Promise<AuthResult>;
  signOutAccount: () => Promise<void>;
  // Whether the current synced household is owned by an account (claimed). null = unknown/not
  // checked yet (e.g. no household, or offline). Drives the "secure this household" prompt.
  householdStatus: HouseholdStatus | null;
  claimHousehold: () => Promise<boolean>;
}

const GravyContext = createContext<GravyContextValue | null>(null);

let toastIdCounter = 0;

export function GravyProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<GravyRoot>(() => loadRoot());
  const [state, setState] = useState<GravyState>(() => activeStateOf(root));
  // Latest values read by the imperative profile/household actions without stale closures. These
  // refs are only ever read inside event-handler callbacks (never during render), so mirroring the
  // current render value here is intentional and safe.
  const stateRef = useRef(state);
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state;
  const rootRef = useRef(root);
  // eslint-disable-next-line react-hooks/refs
  rootRef.current = root;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const pendingTimersRef = useRef<number[]>([]);
  const storageWarnedRef = useRef(false);

  // Cloud-sync + parent-account reactive layer: householdCode/syncStatus/authUser/authReady/
  // householdStatus state plus the Supabase realtime push/subscribe, auth-tracking, and
  // ownership-status effects. `actorRef` (stamped here on sign-in) and `lastSyncedRef` are owned by
  // this hook and forwarded to the imperative action hooks below.
  const {
    householdCode, setHouseholdCode,
    syncStatus, setSyncStatus,
    authUser, authReady,
    householdStatus, setHouseholdStatus,
    lastSyncedRef, actorRef,
  } = useHouseholdSync({ root, state, setRoot, setState });

  const grownUpUnlocked = isGrownUpUnlocked(authUser, householdStatus);
  // True on a device that's never signed in with a real account — i.e. a "kid device" joined
  // via family code only (see Onboarding's "just enter a family code" fork). Unlike
  // grownUpUnlocked this doesn't flip back on when the app is merely locked again; it's a
  // property of the device's auth state, not the momentary lock. Every point-earning action
  // gates on it — see useKidProgressActions.
  const requiresApproval = !authUser;

  // Applies the parent-selected theme to the whole app. useLayoutEffect (rather than
  // useEffect) so the attribute is set before paint, avoiding a flash of the light theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[state.settings.theme]);
  }, [state.settings.theme]);

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

  const showToast = useCallback((icon: IconDefinition | string, msg: string) => {
    const id = ++toastIdCounter;
    setToasts((t) => [...t, { id, icon, msg }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 2800);
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
    (next: GravyState, pts: number, reason: string, opts?: { silent?: boolean }) => {
      applyAward(next, pts);
      if (!opts?.silent) {
        const sign = pts < 0 ? '−' : '+';
        showToast(faStar, `${sign}${Math.abs(pts)} ${reason}`.trim());
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

  // Per-domain action groups, each relocated verbatim into its own hook (see ./actions/*).
  // They receive the shared state setters/refs and the helper callbacks above as dependencies.
  const kidProgress = useKidProgressActions({
    setState, showToast, showCelebration, awardPoints, checkBadges, maybeCelebrateRankUp, actorRef,
    requiresApproval,
  });
  const dayEdit = useDayEditActions({
    setState, stateRef, showToast, awardPointsForDay, checkBadges, maybeCelebrateRankUp, actorRef,
    removeFood: kidProgress.removeFood,
    decrementGoal: kidProgress.decrementGoal,
    undoBonusItem: kidProgress.undoBonusItem,
  });
  const rewards = useRewardActions({ setState, showToast, checkBadges, actorRef });
  const pendingPoints = usePendingPointsActions({
    setState, stateRef, showToast, checkBadges, maybeCelebrateRankUp, actorRef,
    decrementGoal: kidProgress.decrementGoal,
    removeFood: kidProgress.removeFood,
    undoBonusItem: kidProgress.undoBonusItem,
    declineGameWin: kidProgress.declineGameWin,
  });
  const catalog = useCatalogActions({
    setState, showToast, actorRef, pendingTimersRef, setHouseholdCode, lastSyncedRef, setSyncStatus,
  });
  const profile = useProfileActions({ setState, setRoot, stateRef, rootRef, showToast, actorRef });
  const household = useHouseholdActions({
    setState, setRoot, stateRef, rootRef, showToast, actorRef, setSyncStatus,
    setHouseholdCode, lastSyncedRef, pendingTimersRef, householdCode, authUser, setHouseholdStatus,
  });

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
    toasts,
    celebration,
    confettiTrigger,
    showToast,
    dismissToast,
    hideCelebration,
    grownUpUnlocked,
    householdCode,
    syncStatus,
    authUser,
    authReady,
    householdStatus,
    ...kidProgress,
    ...dayEdit,
    ...rewards,
    ...pendingPoints,
    ...catalog,
    ...profile,
    ...household,
  };

  return <GravyContext.Provider value={value}>{children}</GravyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGravy(): GravyContextValue {
  const ctx = useContext(GravyContext);
  if (!ctx) throw new Error('useGravy must be used within a GravyProvider');
  return ctx;
}
