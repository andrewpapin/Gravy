import type { GrubClubState } from './types';

export const STORAGE_KEY = 'grubclub_v2';

export const defaultState: GrubClubState = {
  points: 0,
  totalPoints: 0,
  streak: 0,
  lastActiveDate: null,
  todayPoints: 0,
  todayFoods: [],
  todayChores: [],
  pendingRewards: [],
  earnedBadges: [],
  counters: {
    foodLogs: {},
    fullTrayDays: 0,
    totalChores: 0,
    allChoresDays: 0,
    comboDays: 0,
    totalRewards: 0,
    maxDayPoints: 0,
  },
  badgeConfig: {},
  chores: [
    { id: 1, emoji: '🛏️', name: 'Make your bed', pts: 10 },
    { id: 2, emoji: '🦷', name: 'Brush teeth', pts: 5 },
    { id: 3, emoji: '🍽️', name: 'Set the table', pts: 10 },
  ],
  rewards: [
    { id: 1, emoji: '🎮', name: '30 min screen time', cost: 50 },
    { id: 2, emoji: '🍦', name: 'Ice cream pick', cost: 75 },
    { id: 3, emoji: '💸', name: '400 Robux', cost: 200 },
  ],
  settings: {
    foodPts: 10,
    bonusPts: 25,
    weeklyCap: 0,
    pin: '1234',
  },
};

export function cloneDefaultState(): GrubClubState {
  return JSON.parse(JSON.stringify(defaultState));
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadState(): GrubClubState {
  let state: GrubClubState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    state = saved ? JSON.parse(saved) : cloneDefaultState();
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
    state.todayFoods = [];
    state.todayChores = [];
    state.todayPoints = 0;
  }
  state.lastActiveDate = today;
  return state;
}
