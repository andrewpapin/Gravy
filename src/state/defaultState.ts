import type { GrubClubState } from './types';

export const STORAGE_KEY = 'grubclub_v2';

export const defaultState: GrubClubState = {
  points: 0,
  totalPoints: 0,
  streak: 0,
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
    { id: 1, emoji: '🛏️', name: 'Make your bed', pts: 10, isDaily: true },
    { id: 2, emoji: '🦷', name: 'Brush teeth', pts: 5, isDaily: true },
    { id: 3, emoji: '🍽️', name: 'Set the table', pts: 10, isDaily: true },
  ],
  rewards: [
    { id: 1, emoji: '🎮', name: '30 min screen time', cost: 50 },
    { id: 2, emoji: '🍦', name: 'Ice cream pick', cost: 75 },
    { id: 3, emoji: '💸', name: '400 Robux', cost: 200 },
  ],
  settings: {
    foodPts: 10,
    bonusPts: 25,
    pin: '1234',
    childName: 'Zack',
  },
};

export function cloneDefaultState(): GrubClubState {
  return JSON.parse(JSON.stringify(defaultState));
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
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

export function loadState(): GrubClubState {
  let state: GrubClubState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const raw = saved ? JSON.parse(saved) : null;
    if (raw) {
      migrateLegacyState(raw as Record<string, unknown>);
      state = raw as GrubClubState;
    } else {
      state = cloneDefaultState();
    }
    const stateRecord = state as unknown as Record<string, unknown>;
    for (const k of Object.keys(defaultState) as (keyof GrubClubState)[]) {
      if (!(k in state)) {
        stateRecord[k] = JSON.parse(JSON.stringify(defaultState[k]));
      }
    }
    if (!state.settings) state.settings = { ...defaultState.settings };
    const settingsRecord = state.settings as unknown as Record<string, unknown>;
    for (const k of Object.keys(defaultState.settings) as (keyof GrubClubState['settings'])[]) {
      if (!(k in state.settings)) settingsRecord[k] = defaultState.settings[k];
    }
    if (!state.counters) state.counters = JSON.parse(JSON.stringify(defaultState.counters));
    const countersRecord = state.counters as unknown as Record<string, unknown>;
    for (const k of Object.keys(defaultState.counters) as (keyof GrubClubState['counters'])[]) {
      if (!(k in state.counters)) countersRecord[k] = defaultState.counters[k];
    }
    if (!state.counters.foodLogs) state.counters.foodLogs = {};
    if (!state.badgeConfig) state.badgeConfig = {};
  } catch {
    state = cloneDefaultState();
  }
  return applyDayRollover(state);
}

export function saveState(state: GrubClubState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyDayRollover(state: GrubClubState): GrubClubState {
  const today = todayStr();
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (state.lastActiveDate === yStr) {
      state.streak++;
    } else {
      state.streak = 0;
    }
    const hadActivity =
      Object.keys(state.todayFoodCounts).length > 0 ||
      state.todayGoals.length > 0 ||
      state.todayPoints > 0;
    if (hadActivity) {
      state.dayLogs[state.lastActiveDate] = {
        foodCounts: { ...state.todayFoodCounts },
        goalIds: [...state.todayGoals],
        points: state.todayPoints,
      };
    }
    state.todayFoodCounts = {};
    state.todayPoints = 0;
    // Only clear daily goal completions; non-daily completions persist until explicitly cleared.
    const dailyIds = new Set(
      (state.goals || []).filter((g) => g.isDaily !== false).map((g) => g.id)
    );
    state.todayGoals = (state.todayGoals || []).filter((id) => !dailyIds.has(id));
    if (!state.todayGoalCounts) state.todayGoalCounts = {};
    for (const id of dailyIds) {
      delete state.todayGoalCounts[id];
    }
  }
  state.lastActiveDate = today;
  return state;
}
