import type { GravyState } from './types';
import { FOODS } from '../data/foods';

export const STORAGE_KEY = 'gravy_v1';

export const defaultState: GravyState = {
  points: 0,
  totalPoints: 0,
  streak: 0,
  foodStreak: 0,
  goalStreak: 0,
  megaStreak: 0,
  lastActiveDate: null,
  todayPoints: 0,
  todayFoodCounts: {},
  todayGoals: [],
  todayGoalCounts: {},
  dayLogs: {},
  pendingRewards: [],
  earnedBadges: [],
  counters: {
    foodLogs: {},
    fullTrayDays: 0,
    totalGoals: 0,
    allGoalsDays: 0,
    comboDays: 0,
    totalRewards: 0,
    maxDayPoints: 0,
  },
  badgeConfig: {},
  goals: [
    { id: 1, emoji: '🛏️', icon: 'bed', name: 'Make your bed', pts: 10, isDaily: true },
    { id: 2, emoji: '🦷', icon: 'tooth', name: 'Brush teeth', pts: 5, isDaily: true },
    { id: 3, emoji: '🍽️', icon: 'plateWheat', name: 'Set the table', pts: 10, isDaily: true },
  ],
  rewards: [
    { id: 1, emoji: '🎮', icon: 'gamepad', name: '30 min screen time', cost: 50 },
    { id: 2, emoji: '🍦', icon: 'iceCream', name: 'Ice cream pick', cost: 75 },
    { id: 3, emoji: '💸', icon: 'moneyBill', name: '400 Robux', cost: 200 },
  ],
  settings: {
    foodPts: 10,
    bonusPts: 25,
    pin: '1234',
    childName: 'Zack',
    recoveryQuestion: '',
    recoveryAnswer: '',
    theme: 'light',
    avatarIcon: 'faceSmile',
    avatarIconColor: '#2F3E46',
    avatarBgColor: '#FFFFFF',
  },
};

export function cloneDefaultState(): GravyState {
  return JSON.parse(JSON.stringify(defaultState));
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Migrates saved state that was written by an older version of the app
// (when the data model used "chores"/"todayChores"/"choreIds" terminology).
// Safe to call multiple times — checks before overwriting.
export function migrateLegacyState(state: Record<string, unknown>): void {
  // Top-level field renames
  if ('chores' in state && !('goals' in state)) {
    state.goals = state.chores;
    delete state.chores;
  }
  if ('todayChores' in state && !('todayGoals' in state)) {
    state.todayGoals = state.todayChores;
    delete state.todayChores;
  }

  // Backfill isDaily on existing goals (undefined => true)
  if (Array.isArray(state.goals)) {
    for (const g of state.goals as Record<string, unknown>[]) {
      if (!('isDaily' in g)) g.isDaily = true;
    }
  }

  // NOTE: the `icon` field (goals/rewards/badge overrides) is additive and intentionally
  // NOT backfilled here. Items created before the icon system keep only their `emoji`
  // string and render via the emoji fallback (see components/AppIcon.tsx) until a parent
  // edits them and picks an icon. This keeps the change safe for Supabase last-write-wins.

  // Backfill todayGoalCounts from todayGoals for saves that predate count tracking
  if (!state.todayGoalCounts && Array.isArray(state.todayGoals) && Array.isArray(state.goals)) {
    const counts: Record<number, number> = {};
    for (const id of state.todayGoals as number[]) {
      const goal = (state.goals as Record<string, unknown>[]).find((g) => g.id === id);
      counts[id] = (goal?.target as number | undefined) || 1;
    }
    state.todayGoalCounts = counts;
  }

  // Counter renames
  const counters = state.counters as Record<string, unknown> | undefined;
  if (counters) {
    if ('totalChores' in counters && !('totalGoals' in counters)) {
      counters.totalGoals = counters.totalChores;
      delete counters.totalChores;
    }
    if ('allChoresDays' in counters && !('allGoalsDays' in counters)) {
      counters.allGoalsDays = counters.allChoresDays;
      delete counters.allChoresDays;
    }
  }

  // dayLogs[*].choreIds -> goalIds
  const dayLogs = state.dayLogs as Record<string, Record<string, unknown>> | undefined;
  if (dayLogs) {
    for (const log of Object.values(dayLogs)) {
      if ('choreIds' in log && !('goalIds' in log)) {
        log.goalIds = log.choreIds;
        delete log.choreIds;
      }
    }
  }
}

// Walks backward day-by-day from yesterday through `dayLogs`, replaying the same
// full-tray/all-goals conditions `applyDayRollover` uses, to seed foodStreak/goalStreak/
// megaStreak for saves written before these fields existed (so upgrading doesn't reset
// an in-progress streak to 0).
function backfillStreaksFromLogs(state: GravyState): void {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  let foodStreak = 0;
  let goalStreak = 0;
  let megaStreak = 0;
  let trackingFood = true;
  let trackingGoal = true;
  let trackingMega = true;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 3650 && (trackingFood || trackingGoal || trackingMega); i++) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = state.dayLogs[dateStr];
    if (!log) break;
    const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
    const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
    if (trackingFood && fullTray) foodStreak++; else trackingFood = false;
    if (trackingGoal && allGoalsDone) goalStreak++; else trackingGoal = false;
    if (trackingMega && fullTray && allGoalsDone) megaStreak++; else trackingMega = false;
    d.setDate(d.getDate() - 1);
  }
  state.foodStreak = foodStreak;
  state.goalStreak = goalStreak;
  state.megaStreak = megaStreak;
}

export function loadState(): GravyState {
  let state: GravyState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const raw = saved ? JSON.parse(saved) : null;
    if (raw) {
      migrateLegacyState(raw as Record<string, unknown>);
      state = raw as GravyState;
    } else {
      state = cloneDefaultState();
    }
    const stateRecord = state as unknown as Record<string, unknown>;
    const hadStreakFields =
      'foodStreak' in stateRecord || 'goalStreak' in stateRecord || 'megaStreak' in stateRecord;
    for (const k of Object.keys(defaultState) as (keyof GravyState)[]) {
      if (!(k in state)) {
        stateRecord[k] = JSON.parse(JSON.stringify(defaultState[k]));
      }
    }
    if (!hadStreakFields) backfillStreaksFromLogs(state);
    if (!state.settings) state.settings = { ...defaultState.settings };
    const settingsRecord = state.settings as unknown as Record<string, unknown>;
    for (const k of Object.keys(defaultState.settings) as (keyof GravyState['settings'])[]) {
      if (!(k in state.settings)) settingsRecord[k] = defaultState.settings[k];
    }
    if (!state.counters) state.counters = JSON.parse(JSON.stringify(defaultState.counters));
    const countersRecord = state.counters as unknown as Record<string, unknown>;
    for (const k of Object.keys(defaultState.counters) as (keyof GravyState['counters'])[]) {
      if (!(k in state.counters)) countersRecord[k] = defaultState.counters[k];
    }
    if (!state.counters.foodLogs) state.counters.foodLogs = {};
    if (!state.badgeConfig) state.badgeConfig = {};
  } catch {
    state = cloneDefaultState();
  }
  return applyDayRollover(state);
}

export function saveState(state: GravyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyDayRollover(state: GravyState): GravyState {
  const today = todayStr();
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const hadActivity =
      Object.keys(state.todayFoodCounts).length > 0 ||
      state.todayGoals.length > 0 ||
      state.todayPoints > 0 ||
      Object.values(state.todayGoalCounts || {}).some((c) => c > 0);
    // The streak only extends if the day being closed out had real activity logged —
    // just having the app open isn't enough, otherwise the streak couldn't ever be "at risk".
    if (state.lastActiveDate === yStr && hadActivity) {
      state.streak++;
    } else {
      state.streak = 0;
    }
    const fullTray = FOODS.every((f) => (state.todayFoodCounts[f.id] || 0) > 0);
    const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
    const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => state.todayGoals.includes(g.id));
    const closedOutYesterday = state.lastActiveDate === yStr;
    state.foodStreak = closedOutYesterday && fullTray ? state.foodStreak + 1 : 0;
    state.goalStreak = closedOutYesterday && allGoalsDone ? state.goalStreak + 1 : 0;
    state.megaStreak = closedOutYesterday && fullTray && allGoalsDone ? state.megaStreak + 1 : 0;
    if (hadActivity) {
      const bonusIds = new Set(
        (state.goals || []).filter((g) => g.isDaily === false).map((g) => g.id)
      );
      const bonusCounts: Record<number, number> = {};
      for (const [id, count] of Object.entries(state.todayGoalCounts || {})) {
        if (bonusIds.has(Number(id))) bonusCounts[Number(id)] = count;
      }
      state.dayLogs[state.lastActiveDate] = {
        foodCounts: { ...state.todayFoodCounts },
        goalIds: [...state.todayGoals],
        points: state.todayPoints,
        bonusCounts,
      };
    }
    state.todayFoodCounts = {};
    state.todayPoints = 0;
    // Daily goals and Bonus Points items both reset daily — keep only ids of
    // current Daily goals (also self-heals any stale legacy one-time-goal ids).
    const dailyIds = new Set(
      (state.goals || []).filter((g) => g.isDaily !== false).map((g) => g.id)
    );
    state.todayGoals = (state.todayGoals || []).filter((id) => dailyIds.has(id));
    state.todayGoalCounts = {};
  }
  state.lastActiveDate = today;
  return state;
}
