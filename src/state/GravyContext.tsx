import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faTriangleExclamation, faStar } from '@fortawesome/free-solid-svg-icons';
import type { ActionLogEntry, DayLog, Goal, GravyRoot, GravyState, ProfileEntry, Reward, Theme } from './types';
import {
  applyDayRollover,
  loadRoot,
  saveRoot,
  hydrateState,
  mirrorSharedFields,
} from './defaultState';
import { type LogActor } from './actionLog';
import { resolveToastIcon } from '../data/icons';
import { findNewlyEarnedBadges, getBadgeDisplay } from './badges';
import { applyAward, applyAwardForDay } from './points';
import { getRank, RANKS } from '../data/ranks';
import { pushHouseholdState, subscribeToHousehold } from './sync';
import { safeGetItem } from './storage';
import { readGrownUpUnlocked, writeGrownUpUnlocked } from './grownUpUnlock';
import {
  type AuthResult,
  type AuthUser,
  type HouseholdStatus,
  getHouseholdStatus,
  onAuthChange,
} from './auth';
import { HOUSEHOLD_CODE_KEY, SYNC_SKIPPED_KEY, DAILY_GAME_WIN_CAP, activeStateOf, buildMergedRoot, clone } from './actions/shared';
import type { ProfilePatch, SettableSettingKey, SyncStatus } from './actions/types';
import { useKidProgressActions } from './actions/useKidProgressActions';
import { useDayEditActions } from './actions/useDayEditActions';
import { useRewardActions } from './actions/useRewardActions';
import { useCatalogActions } from './actions/useCatalogActions';
import { useProfileActions } from './actions/useProfileActions';
import { useHouseholdActions } from './actions/useHouseholdActions';

// Re-exported here so existing consumers (Onboarding, SyncGateModal, GamesScreen) keep their
// import path; the source of truth now lives in ./actions/shared.
export { SYNC_SKIPPED_KEY, DAILY_GAME_WIN_CAP };
export type { SyncStatus };

const THEME_COLORS: Record<Theme, string> = {
  classic: '#f4ece4',
  midnight: '#1e1e24',
  ocean: '#e0f7fa',
  bubblegum: '#ffe5ec',
  cyberpunk: '#fcee0a',
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
  grownUpUnlocked: boolean;
  unlockGrownUpAccess: () => void;
  lockGrownUpAccess: () => void;
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
  const [householdCode, setHouseholdCode] = useState<string | null>(() =>
    safeGetItem(HOUSEHOLD_CODE_KEY),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [grownUpUnlocked, setGrownUpUnlocked] = useState(() => readGrownUpUnlocked());
  const unlockGrownUpAccess = useCallback(() => {
    writeGrownUpUnlocked(true);
    setGrownUpUnlocked(true);
  }, []);
  const lockGrownUpAccess = useCallback(() => {
    writeGrownUpUnlocked(false);
    setGrownUpUnlocked(false);
  }, []);
  // Parent account (Epic 8). Independent of the kid-screen PIN/grownUpUnlocked lock above —
  // signing in identifies a parent for household ownership, the PIN keeps a kid out of the
  // dashboard on a shared device. authReady gates UI until the initial session check resolves.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [householdStatus, setHouseholdStatus] = useState<HouseholdStatus | null>(null);
  const lastSyncedRef = useRef<string | null>(null);
  const pendingTimersRef = useRef<number[]>([]);
  const storageWarnedRef = useRef(false);
  // Read synchronously by the log-append helpers so every entry is stamped with the parent
  // account that performed it without re-creating those callbacks on each sign-in (Epic 8 item 5/6).
  const actorRef = useRef<LogActor | undefined>(undefined);

  // Track the signed-in parent account. Fires once on mount with the current session (or null)
  // and again on every sign-in/out.
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      setAuthReady(true);
      actorRef.current = user ? { userId: user.id, label: user.email ?? undefined } : undefined;
    });
    return unsub;
  }, []);

  // Refresh whether the current household is claimed whenever the code or the signed-in account
  // changes — drives the "secure this household" prompt. Failures (offline) leave status null.
  useEffect(() => {
    if (!householdCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHouseholdStatus(null);
      return;
    }
    let cancelled = false;
    getHouseholdStatus(householdCode)
      .then((s) => { if (!cancelled) setHouseholdStatus(s); })
      .catch(() => { if (!cancelled) setHouseholdStatus(null); });
    return () => { cancelled = true; };
  }, [householdCode, authUser]);

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
  });
  const dayEdit = useDayEditActions({
    setState, stateRef, showToast, awardPointsForDay, checkBadges, maybeCelebrateRankUp, actorRef,
    removeFood: kidProgress.removeFood,
    decrementGoal: kidProgress.decrementGoal,
    undoBonusItem: kidProgress.undoBonusItem,
  });
  const rewards = useRewardActions({ setState, showToast, checkBadges, actorRef });
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
    unlockGrownUpAccess,
    lockGrownUpAccess,
    householdCode,
    syncStatus,
    authUser,
    authReady,
    householdStatus,
    ...kidProgress,
    ...dayEdit,
    ...rewards,
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
