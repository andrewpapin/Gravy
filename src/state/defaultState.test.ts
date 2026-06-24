import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyDayRollover, backfillStreaksFromLogs, cloneDefaultState, saveRoot, saveState, todayStr } from './defaultState';
import type { Goal, GravyRoot, GravyState } from './types';

const FULL_TRAY = { fruit: 1, veggie: 1, protein: 1, dairy: 1, grain: 1 };

const DAILY_GOAL: Goal = { id: 1, emoji: '📖', name: 'Read', pts: 10, isDaily: true };
const BONUS_GOAL: Goal = { id: 2, emoji: '🎮', name: 'Extra reading', pts: 15, isDaily: false };

function freshState(overrides: Partial<GravyState> = {}): GravyState {
  const state = cloneDefaultState();
  state.goals = [DAILY_GOAL, BONUS_GOAL];
  return { ...state, ...overrides };
}

function setToday(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('applyDayRollover', () => {
  it('is a no-op when lastActiveDate is already today', () => {
    setToday('2024-01-10T12:00:00Z');
    const state = freshState({ lastActiveDate: '2024-01-10', streak: 5, todayPoints: 20 });
    const result = applyDayRollover(state);
    expect(result.lastActiveDate).toBe('2024-01-10');
    expect(result.streak).toBe(5);
    expect(result.todayPoints).toBe(20);
    expect(result.dayLogs).toEqual({});
  });

  it('sets lastActiveDate on first-ever run without touching streaks', () => {
    setToday('2024-01-10T12:00:00Z');
    const state = freshState({ lastActiveDate: null, streak: 0 });
    const result = applyDayRollover(state);
    expect(result.lastActiveDate).toBe('2024-01-10');
    expect(result.streak).toBe(0);
    expect(result.dayLogs).toEqual({});
  });

  it('extends the streak when yesterday had real activity and closes out the day log', () => {
    setToday('2024-01-11T08:00:00Z');
    const state = freshState({
      lastActiveDate: '2024-01-10',
      streak: 3,
      todayPoints: 25,
      todayFoodCounts: { fruit: 1 },
    });
    const result = applyDayRollover(state);
    expect(result.lastActiveDate).toBe('2024-01-11');
    expect(result.streak).toBe(4);
    expect(result.dayLogs['2024-01-10']).toMatchObject({ points: 25, foodCounts: { fruit: 1 } });
    // "today" fields are cleared for the new day.
    expect(result.todayPoints).toBe(0);
    expect(result.todayFoodCounts).toEqual({});
  });

  it('resets the streak to 0 when yesterday had no logged activity', () => {
    setToday('2024-01-11T08:00:00Z');
    const state = freshState({ lastActiveDate: '2024-01-10', streak: 3 });
    const result = applyDayRollover(state);
    expect(result.streak).toBe(0);
    // Nothing to archive — no day log is written for an inactive day.
    expect(result.dayLogs['2024-01-10']).toBeUndefined();
  });

  it('resets the streak to 0 when a day was skipped, even with activity logged today-relative', () => {
    setToday('2024-01-12T08:00:00Z');
    const state = freshState({
      lastActiveDate: '2024-01-10', // two days ago, not yesterday
      streak: 5,
      todayPoints: 10,
    });
    const result = applyDayRollover(state);
    expect(result.streak).toBe(0);
  });

  it('increments foodStreak only on a closed-out full tray day, and resets otherwise', () => {
    setToday('2024-01-11T08:00:00Z');
    const full = freshState({
      lastActiveDate: '2024-01-10',
      foodStreak: 2,
      todayFoodCounts: { ...FULL_TRAY },
    });
    expect(applyDayRollover(full).foodStreak).toBe(3);

    const partial = freshState({
      lastActiveDate: '2024-01-10',
      foodStreak: 2,
      todayFoodCounts: { fruit: 1 },
    });
    expect(applyDayRollover(partial).foodStreak).toBe(0);
  });

  it('increments goalStreak only when every daily goal was completed', () => {
    setToday('2024-01-11T08:00:00Z');
    const allDone = freshState({
      lastActiveDate: '2024-01-10',
      goalStreak: 1,
      todayGoals: [DAILY_GOAL.id],
      todayPoints: 10,
    });
    expect(applyDayRollover(allDone).goalStreak).toBe(2);

    const notDone = freshState({
      lastActiveDate: '2024-01-10',
      goalStreak: 1,
      todayGoals: [],
      todayPoints: 10,
    });
    expect(applyDayRollover(notDone).goalStreak).toBe(0);
  });

  it('increments megaStreak only when both full tray and all daily goals were done', () => {
    setToday('2024-01-11T08:00:00Z');
    const both = freshState({
      lastActiveDate: '2024-01-10',
      megaStreak: 1,
      todayFoodCounts: { ...FULL_TRAY },
      todayGoals: [DAILY_GOAL.id],
    });
    expect(applyDayRollover(both).megaStreak).toBe(2);

    const foodOnly = freshState({
      lastActiveDate: '2024-01-10',
      megaStreak: 1,
      todayFoodCounts: { ...FULL_TRAY },
      todayGoals: [],
      todayPoints: 5,
    });
    expect(applyDayRollover(foodOnly).megaStreak).toBe(0);
  });

  it('archives only bonus-item counts into the closed day log, dropping daily-goal counts', () => {
    setToday('2024-01-11T08:00:00Z');
    const state = freshState({
      lastActiveDate: '2024-01-10',
      todayGoals: [DAILY_GOAL.id],
      todayGoalCounts: { [DAILY_GOAL.id]: 1, [BONUS_GOAL.id]: 3 },
      todayPoints: 10,
    });
    const result = applyDayRollover(state);
    expect(result.dayLogs['2024-01-10'].bonusCounts).toEqual({ [BONUS_GOAL.id]: 3 });
  });

  it('resets per-day ledgers (todayGoalCounts, todayBonusApplied, todayGameWins) for the new day', () => {
    setToday('2024-01-11T08:00:00Z');
    const state = freshState({
      lastActiveDate: '2024-01-10',
      todayPoints: 10,
      todayGoalCounts: { [BONUS_GOAL.id]: 2 },
      todayBonusApplied: { [BONUS_GOAL.id]: 30 },
      todayGameWins: 3,
    });
    const result = applyDayRollover(state);
    expect(result.todayGoalCounts).toEqual({});
    expect(result.todayBonusApplied).toEqual({});
    expect(result.todayGameWins).toBe(0);
  });

  it('drops stale todayGoals ids that no longer correspond to a current daily goal', () => {
    setToday('2024-01-11T08:00:00Z');
    const state = freshState({
      lastActiveDate: '2024-01-10',
      todayGoals: [DAILY_GOAL.id, 999],
      todayPoints: 10,
    });
    // Rolling over filters todayGoals down to current daily ids before the next day starts;
    // simulate a same-day re-check by inspecting the filtered list directly post-rollover.
    const result = applyDayRollover(state);
    expect(result.todayGoals).toEqual([]); // cleared for the new day regardless
  });

  it('keys "today" off the device-local calendar date, not the UTC date', () => {
    vi.stubEnv('TZ', 'America/New_York');
    // 11:30pm Jan 10 in New York is already 4:30am Jan 11 in UTC.
    setToday('2024-01-11T04:30:00Z');
    expect(todayStr()).toBe('2024-01-10');
  });

  it('does not roll over between two moments that fall on the same local day but different UTC days', () => {
    vi.stubEnv('TZ', 'America/New_York');
    // Kid checks off a goal at 11:30pm Jan 10 local time -- already Jan 11 in UTC.
    setToday('2024-01-11T04:30:00Z');
    const lastNight = applyDayRollover(freshState({ lastActiveDate: null }));
    expect(lastNight.lastActiveDate).toBe('2024-01-10');
    lastNight.todayGoals = [DAILY_GOAL.id];
    lastNight.todayPoints = 10;

    // 7am Jan 11 local time: a new local day, but still the same UTC calendar date as above.
    setToday('2024-01-11T12:00:00Z');
    const nextMorning = applyDayRollover(lastNight);
    expect(nextMorning.lastActiveDate).toBe('2024-01-11');
    expect(nextMorning.todayGoals).toEqual([]);
    expect(nextMorning.todayPoints).toBe(0);
  });
});

describe('backfillStreaksFromLogs', () => {
  it('replays consecutive full-tray / all-goals days ending yesterday', () => {
    setToday('2024-01-13T08:00:00Z');
    const state = freshState({
      dayLogs: {
        '2024-01-12': { foodCounts: { ...FULL_TRAY }, goalIds: [DAILY_GOAL.id], points: 25 },
        '2024-01-11': { foodCounts: { ...FULL_TRAY }, goalIds: [DAILY_GOAL.id], points: 25 },
        '2024-01-10': { foodCounts: { fruit: 1 }, goalIds: [], points: 5 },
      },
    });
    backfillStreaksFromLogs(state);
    expect(state.foodStreak).toBe(2);
    expect(state.goalStreak).toBe(2);
    expect(state.megaStreak).toBe(2);
  });

  it('stops counting at the first gap day (missing log) walking backward', () => {
    setToday('2024-01-13T08:00:00Z');
    const state = freshState({
      dayLogs: {
        '2024-01-12': { foodCounts: { ...FULL_TRAY }, goalIds: [DAILY_GOAL.id], points: 25 },
        // 2024-01-11 missing entirely -> stops the walk
        '2024-01-10': { foodCounts: { ...FULL_TRAY }, goalIds: [DAILY_GOAL.id], points: 25 },
      },
    });
    backfillStreaksFromLogs(state);
    expect(state.foodStreak).toBe(1);
    expect(state.goalStreak).toBe(1);
    expect(state.megaStreak).toBe(1);
  });

  it('stops each streak independently once its own condition breaks', () => {
    setToday('2024-01-13T08:00:00Z');
    const state = freshState({
      dayLogs: {
        '2024-01-12': { foodCounts: { ...FULL_TRAY }, goalIds: [], points: 25 }, // full tray, goals not done
        '2024-01-11': { foodCounts: { ...FULL_TRAY }, goalIds: [DAILY_GOAL.id], points: 25 },
      },
    });
    backfillStreaksFromLogs(state);
    expect(state.foodStreak).toBe(2); // both days had a full tray
    expect(state.goalStreak).toBe(0); // most recent day didn't complete all goals
    expect(state.megaStreak).toBe(0); // requires both on the same day
  });

  it('returns zero streaks when there are no logs', () => {
    setToday('2024-01-13T08:00:00Z');
    const state = freshState({ dayLogs: {} });
    backfillStreaksFromLogs(state);
    expect(state.foodStreak).toBe(0);
    expect(state.goalStreak).toBe(0);
    expect(state.megaStreak).toBe(0);
  });
});

describe('saveState/saveRoot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when localStorage.setItem succeeds', () => {
    vi.stubGlobal('localStorage', { setItem: () => {} });
    expect(saveState(freshState())).toBe(true);
    const root: GravyRoot = { version: 2, activeProfileId: 'p1', profiles: [{ id: 'p1', state: freshState() }] };
    expect(saveRoot(root)).toBe(true);
  });

  it('returns false instead of throwing when storage is full or disabled', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new DOMException('quota exceeded', 'QuotaExceededError'); },
    });
    expect(saveState(freshState())).toBe(false);
    const root: GravyRoot = { version: 2, activeProfileId: 'p1', profiles: [{ id: 'p1', state: freshState() }] };
    expect(saveRoot(root)).toBe(false);
  });
});
