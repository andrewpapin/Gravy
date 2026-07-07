import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloneDefaultState } from './defaultState';
import { ACTION_LOG_MAX_ENTRIES } from './actionLog';
import { RANKS } from '../data/ranks';
import type { ActionLogEntry, Goal, GravyState } from './types';
import {
  getActivityHeatmap,
  getFavoriteFoods,
  getGamesBreakdown,
  getGoalsTrend,
  getLongestStreakEver,
  getPersonalBests,
  getPointsHistory,
  getRewardsHistory,
} from './statsSnapshot';

const FULL_TRAY = { fruit: 1, veggie: 1, protein: 1, dairy: 1, grain: 1, sweets: 1 };
const DAILY_GOAL: Goal = { id: 1, emoji: '📖', name: 'Read', pts: 10, isDaily: true };

function freshState(overrides: Partial<GravyState> = {}): GravyState {
  const state = cloneDefaultState();
  state.goals = [DAILY_GOAL];
  return { ...state, ...overrides };
}

function setToday(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('getPointsHistory', () => {
  it('is a flat zero series for a brand-new profile with no history', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState();
    const history = getPointsHistory(state, 7);
    expect(history).toHaveLength(7);
    for (const day of history) {
      expect(day.points).toBe(0);
      expect(day.cumulativeTotal).toBe(0);
      expect(day.rankUp).toBe(false);
    }
  });

  it('reconstructs cumulative totals backward from totalPoints through dayLogs', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      totalPoints: 260,
      todayPoints: 20,
      dayLogs: { '2024-03-09': { foodCounts: {}, goalIds: [], points: 240 } },
    });
    const history = getPointsHistory(state, 5);
    expect(history.map((d) => d.points)).toEqual([0, 0, 0, 240, 20]);
    expect(history.map((d) => d.cumulativeTotal)).toEqual([0, 0, 0, 240, 260]);
  });

  it('marks the day a rank threshold is crossed, not days before it', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      totalPoints: 260, // RANKS[1].min is 250
      todayPoints: 20,
      dayLogs: { '2024-03-09': { foodCounts: {}, goalIds: [], points: 240 } },
    });
    const history = getPointsHistory(state, 5);
    expect(RANKS[1].min).toBe(250);
    expect(history.find((d) => d.dateStr === '2024-03-09')!.rankUp).toBe(false);
    expect(history.find((d) => d.dateStr === '2024-03-10')!.rankUp).toBe(true);
  });

  it('treats days before the profile existed as zero, not missing', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      totalPoints: 80,
      dayLogs: {
        '2024-03-08': { foodCounts: {}, goalIds: [], points: 30 },
        '2024-03-09': { foodCounts: {}, goalIds: [], points: 50 },
      },
    });
    const history = getPointsHistory(state, 84);
    expect(history[0].points).toBe(0);
    expect(history[0].cumulativeTotal).toBe(0);
    expect(history.find((d) => d.dateStr === '2024-03-08')).toMatchObject({ points: 30, cumulativeTotal: 30 });
    expect(history.find((d) => d.dateStr === '2024-03-09')).toMatchObject({ points: 50, cumulativeTotal: 80 });
    expect(history.find((d) => d.dateStr === '2024-03-10')).toMatchObject({ points: 0, cumulativeTotal: 80 });
  });
});

describe('getActivityHeatmap', () => {
  it('includes a synthetic entry for today built from live state', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({ todayPoints: 15, todayFoodCounts: { fruit: 1 } });
    const heatmap = getActivityHeatmap(state, 1);
    const todayCell = heatmap[heatmap.length - 1];
    expect(todayCell.dateStr).toBe('2024-03-10');
    expect(todayCell.hasLog).toBe(true);
    expect(todayCell.points).toBe(15);
  });

  it('treats a day with no dayLogs entry as inactive, not zero activity', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      dayLogs: { '2024-03-08': { foodCounts: {}, goalIds: [], points: 40 } },
    });
    const heatmap = getActivityHeatmap(state, 1);
    const gapDay = heatmap.find((d) => d.dateStr === '2024-03-07');
    expect(gapDay).toMatchObject({ hasLog: false, points: 0, intensity: 0 });
  });

  it('buckets intensity relative to the highest-scoring active day in the window', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      dayLogs: {
        '2024-03-08': { foodCounts: {}, goalIds: [], points: 10 },
        '2024-03-09': { foodCounts: {}, goalIds: [], points: 40 },
      },
    });
    const heatmap = getActivityHeatmap(state, 1);
    expect(heatmap.find((d) => d.dateStr === '2024-03-08')!.intensity).toBe(1);
    expect(heatmap.find((d) => d.dateStr === '2024-03-09')!.intensity).toBe(4);
  });
});

describe('getFavoriteFoods', () => {
  it('is empty when nothing has ever been logged', () => {
    const state = freshState();
    expect(getFavoriteFoods(state)).toEqual([]);
  });

  it('sorts descending and truncates to topN', () => {
    const state = freshState({
      counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 5, veggie: 5, protein: 3, dairy: 1 } },
    });
    const top = getFavoriteFoods(state, 2);
    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({ id: 'fruit', count: 5 });
    expect(top[1]).toMatchObject({ id: 'veggie', count: 5 });
  });

  it('falls back gracefully for a food id no longer in the catalog', () => {
    const state = freshState({
      counters: { ...cloneDefaultState().counters, foodLogs: { retiredFood: 7 } },
    });
    const top = getFavoriteFoods(state);
    expect(top).toEqual([{ id: 'retiredFood', label: 'retiredFood', icon: 'utensils', count: 7 }]);
  });
});

describe('getGoalsTrend', () => {
  it('counts completed goals per day and reports lifetime totals', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      counters: { ...cloneDefaultState().counters, allGoalsDays: 4, totalGoals: 12 },
      dayLogs: { '2024-03-09': { foodCounts: {}, goalIds: [1], points: 10 } },
    });
    const trend = getGoalsTrend(state, 3);
    expect(trend.days.find((d) => d.dateStr === '2024-03-09')!.goalsCompleted).toBe(1);
    expect(trend.days.find((d) => d.dateStr === '2024-03-08')!.goalsCompleted).toBe(0);
    expect(trend.allGoalsDays).toBe(4);
    expect(trend.totalGoals).toBe(12);
  });
});

describe('getGamesBreakdown', () => {
  it('reports a zero win rate instead of NaN when no games have been played', () => {
    const state = freshState();
    const breakdown = getGamesBreakdown(state);
    expect(breakdown.gamesPlayed).toBe(0);
    expect(breakdown.winRate).toBe(0);
    expect(breakdown.recentByGame).toEqual([]);
  });

  it('excludes undone entries and ignores game ids no longer in the catalog', () => {
    const actionLog: ActionLogEntry[] = [
      { id: '1', type: 'game', label: 'win', pts: 15, dateStr: '2024-03-09', at: 1, itemId: 'hangman' },
      { id: '2', type: 'game', label: 'win', pts: 15, dateStr: '2024-03-09', at: 2, itemId: 'hangman', undone: true },
      { id: '3', type: 'game', label: 'win', pts: 15, dateStr: '2024-03-09', at: 3, itemId: 'retiredGame' },
    ];
    const state = freshState({
      counters: { ...cloneDefaultState().counters, gamesPlayed: 5, gamesWon: 3 },
      actionLog,
    });
    const breakdown = getGamesBreakdown(state);
    expect(breakdown.winRate).toBeCloseTo(3 / 5);
    expect(breakdown.recentByGame).toEqual([{ id: 'hangman', name: 'Hangman', icon: 'font', recentWins: 1 }]);
  });

  it('flags the recent-window caveat only once actionLog is at its cap', () => {
    const short = freshState({ actionLog: [] });
    expect(getGamesBreakdown(short).isRecentWindowTruncated).toBe(false);

    const full = freshState({
      actionLog: Array.from({ length: ACTION_LOG_MAX_ENTRIES }, (_, i): ActionLogEntry => ({
        id: String(i), type: 'food', label: 'x', pts: 1, dateStr: '2024-03-09', at: i,
      })),
    });
    expect(getGamesBreakdown(full).isRecentWindowTruncated).toBe(true);
  });
});

describe('getPersonalBests', () => {
  it('reports no record day when nothing has ever been logged', () => {
    const state = freshState();
    const bests = getPersonalBests(state);
    expect(bests.bestDayPoints).toBe(0);
    expect(bests.bestDayDateStr).toBeNull();
  });

  it('picks the most recent day on a tie for best day', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      counters: { ...cloneDefaultState().counters, maxDayPoints: 50 },
      dayLogs: {
        '2024-03-05': { foodCounts: {}, goalIds: [], points: 50 },
        '2024-03-08': { foodCounts: {}, goalIds: [], points: 50 },
      },
    });
    expect(getPersonalBests(state).bestDayDateStr).toBe('2024-03-08');
  });

  it('recognizes today as the record day when it ties the stored max live', () => {
    setToday('2024-03-10T12:00:00Z');
    const state = freshState({
      todayPoints: 90,
      counters: { ...cloneDefaultState().counters, maxDayPoints: 90 },
      dayLogs: { '2024-03-05': { foodCounts: {}, goalIds: [], points: 50 } },
    });
    expect(getPersonalBests(state).bestDayDateStr).toBe('2024-03-10');
  });
});

describe('getLongestStreakEver', () => {
  it('finds the best historical run, not just the current (possibly broken) tail', () => {
    setToday('2024-03-20T12:00:00Z');
    const megaDay = { foodCounts: FULL_TRAY, goalIds: [1], points: 100 };
    const state = freshState({
      // Currently broken: no active streak right now.
      streak: 0, foodStreak: 0, goalStreak: 0, megaStreak: 0,
      dayLogs: {
        // 5-day run, then a gap (2024-03-15 missing), then a 4-day run.
        '2024-03-10': megaDay, '2024-03-11': megaDay, '2024-03-12': megaDay,
        '2024-03-13': megaDay, '2024-03-14': megaDay,
        '2024-03-16': megaDay, '2024-03-17': megaDay, '2024-03-18': megaDay, '2024-03-19': megaDay,
      },
    });
    const record = getLongestStreakEver(state);
    expect(record.megaStreak).toBe(5);
    expect(record.foodStreak).toBe(5);
    expect(record.goalStreak).toBe(5);
    expect(record.streak).toBe(5);
  });

  it('never reports less than the current in-progress streak', () => {
    setToday('2024-03-20T12:00:00Z');
    const state = freshState({ streak: 12, foodStreak: 0, goalStreak: 0, megaStreak: 0 });
    expect(getLongestStreakEver(state).streak).toBe(12);
  });
});

describe('getRewardsHistory', () => {
  it('includes only approved, non-undone reward entries', () => {
    const actionLog: ActionLogEntry[] = [
      { id: '1', type: 'rewardRequested', label: 'Treat requested!', pts: 0, dateStr: '2024-03-09', at: 1 },
      { id: '2', type: 'rewardDeclined', label: 'Treat declined', pts: 0, dateStr: '2024-03-09', at: 2 },
      { id: '3', type: 'rewardApproved', label: 'Treat approved!', pts: -75, dateStr: '2024-03-09', at: 3 },
      { id: '4', type: 'rewardApproved', label: 'Undone treat', pts: -50, dateStr: '2024-03-09', at: 4, undone: true },
    ];
    const state = freshState({ actionLog });
    const history = getRewardsHistory(state);
    expect(history).toEqual([{ id: '3', label: 'Treat approved!', pts: -75, dateStr: '2024-03-09', at: 3 }]);
  });

  it('sorts most-recent first and truncates to the limit', () => {
    const actionLog: ActionLogEntry[] = Array.from({ length: 5 }, (_, i): ActionLogEntry => ({
      id: String(i), type: 'rewardApproved', label: `Reward ${i}`, pts: -10, dateStr: '2024-03-09', at: i,
    }));
    const state = freshState({ actionLog });
    const history = getRewardsHistory(state, 2);
    expect(history.map((h) => h.id)).toEqual(['4', '3']);
  });

  it('is empty when nothing has been redeemed', () => {
    const state = freshState();
    expect(getRewardsHistory(state)).toEqual([]);
  });
});
