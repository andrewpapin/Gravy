import type { GravyState } from './types';
import { FOODS } from '../data/foods';
import { GAMES } from '../data/games';
import { ROLL_TO_GOAL_GAME_ID } from '../data/rollToGoal';
import { getRank } from '../data/ranks';
import { getDayLog, hasAnyLog } from './dayLog';
import { todayStr, addDaysToDateStr } from './defaultState';
import { ACTION_LOG_MAX_ENTRIES } from './actionLog';

// Matches backfillStreaksFromLogs's lookback cap — dayLogs is uncapped, so this just bounds
// worst-case scan cost on a very old save.
const LONGEST_STREAK_LOOKBACK_DAYS = 3650;

export interface PointsHistoryDay {
  dateStr: string;
  points: number;
  cumulativeTotal: number;
  rankUp: boolean;
}

// Reconstructs each day's lifetime point total by walking backward from today's known
// totalPoints through dayLogs — there's no historized totalPoints snapshot, but totalPoints
// is only ever moved by the same day-scoped point functions that write dayLogs, so this is
// exact unless the save was reset outside the normal day-rollover path (e.g. "Reset All").
export function getPointsHistory(state: GravyState, days = 84): PointsHistoryDay[] {
  const today = todayStr(state.settings.timezone);
  const dateStrs = Array.from({ length: days }, (_, i) => addDaysToDateStr(today, -(days - 1 - i)));
  const pointsByDay = dateStrs.map((d) => getDayLog(state, d, today)?.points ?? 0);

  const cumulative = new Array<number>(dateStrs.length);
  cumulative[dateStrs.length - 1] = state.totalPoints;
  for (let i = dateStrs.length - 2; i >= 0; i--) {
    cumulative[i] = cumulative[i + 1] - pointsByDay[i + 1];
  }

  return dateStrs.map((dateStr, i) => {
    const cumulativeTotal = cumulative[i];
    const priorTotal = cumulativeTotal - pointsByDay[i];
    const rankUp = getRank(priorTotal).index < getRank(cumulativeTotal).index;
    return { dateStr, points: pointsByDay[i], cumulativeTotal, rankUp };
  });
}

// Average points earned per calendar day over the trailing window (including today's
// in-progress total), following the same reconstruction getPointsHistory uses. Zero-point/
// inactive days count toward the average (not just active days), so this reflects the kid's
// actual day-to-day pace including off days.
export function getAverageDailyPoints(state: GravyState, days = 14): number {
  const today = todayStr(state.settings.timezone);
  const dateStrs = Array.from({ length: days }, (_, i) => addDaysToDateStr(today, -(days - 1 - i)));
  const total = dateStrs.reduce((sum, d) => sum + (getDayLog(state, d, today)?.points ?? 0), 0);
  return total / days;
}

export interface HeatmapDay {
  dateStr: string;
  points: number;
  hasLog: boolean;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export function getActivityHeatmap(state: GravyState, weeks = 12): HeatmapDay[] {
  const today = todayStr(state.settings.timezone);
  const days = weeks * 7;
  const raw = Array.from({ length: days }, (_, i) => {
    const dateStr = addDaysToDateStr(today, -(days - 1 - i));
    const log = getDayLog(state, dateStr, today);
    const active = hasAnyLog(log);
    return { dateStr, points: active ? log!.points : 0, hasLog: active };
  });

  const maxPoints = Math.max(0, ...raw.filter((d) => d.hasLog).map((d) => d.points));

  return raw.map((d) => {
    if (!d.hasLog) return { ...d, intensity: 0 as const };
    const bucket = maxPoints > 0 ? Math.ceil((d.points / maxPoints) * 4) : 1;
    return { ...d, intensity: Math.min(4, Math.max(1, bucket)) as 1 | 2 | 3 | 4 };
  });
}

export interface FavoriteFood {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export function getFavoriteFoods(state: GravyState, topN = 3): FavoriteFood[] {
  return Object.entries(state.counters.foodLogs)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, count]) => {
      const food = FOODS.find((f) => f.id === id);
      return { id, label: food?.label ?? id, icon: food?.icon ?? 'utensils', count };
    });
}

export interface GoalsTrendDay {
  dateStr: string;
  goalsCompleted: number;
}

export interface GoalsTrend {
  days: GoalsTrendDay[];
  allGoalsDays: number;
  totalGoals: number;
}

export function getGoalsTrend(state: GravyState, days = 28): GoalsTrend {
  const today = todayStr(state.settings.timezone);
  const trend = Array.from({ length: days }, (_, i) => {
    const dateStr = addDaysToDateStr(today, -(days - 1 - i));
    const log = getDayLog(state, dateStr, today);
    return { dateStr, goalsCompleted: log?.goalIds.length ?? 0 };
  });
  return { days: trend, allGoalsDays: state.counters.allGoalsDays, totalGoals: state.counters.totalGoals };
}

export interface GameBreakdownEntry {
  id: string;
  name: string;
  icon: string;
  recentWins: number;
}

export interface GamesBreakdown {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  // Per-game split can only be derived from actionLog (Roll to the Goal only logs a round when
  // it pays real points, i.e. non-bust), which is itself FIFO-capped at ACTION_LOG_MAX_ENTRIES —
  // so this is a "recent" breakdown, not a lifetime one.
  recentByGame: GameBreakdownEntry[];
  isRecentWindowTruncated: boolean;
}

export function getGamesBreakdown(state: GravyState): GamesBreakdown {
  const gamesPlayed = state.counters.gamesPlayed;
  const gamesWon = state.counters.gamesWon;
  const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;

  const winsByGame = new Map<string, number>();
  for (const entry of state.actionLog) {
    if (entry.type !== 'game' || entry.undone) continue;
    const id = String(entry.itemId ?? '');
    winsByGame.set(id, (winsByGame.get(id) ?? 0) + 1);
  }
  const recentByGame = GAMES.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    recentWins: winsByGame.get(g.id) ?? 0,
  }))
    .filter((g) => g.recentWins > 0)
    .sort((a, b) => b.recentWins - a.recentWins);

  return {
    gamesPlayed,
    gamesWon,
    winRate,
    recentByGame,
    isRecentWindowTruncated: state.actionLog.length >= ACTION_LOG_MAX_ENTRIES,
  };
}

export interface RollToGoalHistoryEntry {
  id: string;
  label: string;
  pts: number;
  dateStr: string;
  at: number;
}

// Recent Roll to the Goal rounds that paid real points — a bust round never calls
// appendActionLog at all (see completeRollToGoalRound), so this is a "scoring rounds" history,
// not literally every round played. Same shape/pattern as getRewardsHistory.
export function getRollToGoalHistory(state: GravyState, limit = 10): RollToGoalHistoryEntry[] {
  return state.actionLog
    .filter((e) => e.type === 'game' && e.itemId === ROLL_TO_GOAL_GAME_ID && !e.undone)
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((e) => ({ id: e.id, label: e.label, pts: e.pts, dateStr: e.dateStr, at: e.at }));
}

export interface RewardHistoryEntry {
  id: string;
  label: string;
  pts: number;
  dateStr: string;
  at: number;
}

// "Redeemed" means approved, not requested — counters.totalRewards increments on request
// (see useRewardActions.requestReward), so it deliberately isn't used here.
export function getRewardsHistory(state: GravyState, limit = 10): RewardHistoryEntry[] {
  return state.actionLog
    .filter((e) => e.type === 'rewardApproved' && !e.undone)
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((e) => ({ id: e.id, label: e.label, pts: e.pts, dateStr: e.dateStr, at: e.at }));
}

export interface StreakRecord {
  streak: number;
  foodStreak: number;
  goalStreak: number;
  megaStreak: number;
}

// Current streaks (state.streak etc.) reset to 0 on a broken run and keep no running max.
// This replays dayLogs day-by-day like backfillStreaksFromLogs does, but — unlike that
// function, which only needs the unbroken tail and so `break`s on the first gap — this has
// to keep scanning past gaps to find the best historical run, tracking a running max instead.
export function getLongestStreakEver(state: GravyState): StreakRecord {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const today = todayStr(state.settings.timezone);

  let runStreak = 0;
  let runFood = 0;
  let runGoal = 0;
  let runMega = 0;
  let maxStreak = 0;
  let maxFood = 0;
  let maxGoal = 0;
  let maxMega = 0;

  let dateStr = addDaysToDateStr(today, -1);
  for (let i = 0; i < LONGEST_STREAK_LOOKBACK_DAYS; i++) {
    const log = state.dayLogs[dateStr];
    if (log) {
      runStreak++;
      const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
      const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
      runFood = fullTray ? runFood + 1 : 0;
      runGoal = allGoalsDone ? runGoal + 1 : 0;
      runMega = fullTray && allGoalsDone ? runMega + 1 : 0;
    } else {
      runStreak = 0;
      runFood = 0;
      runGoal = 0;
      runMega = 0;
    }
    maxStreak = Math.max(maxStreak, runStreak);
    maxFood = Math.max(maxFood, runFood);
    maxGoal = Math.max(maxGoal, runGoal);
    maxMega = Math.max(maxMega, runMega);
    dateStr = addDaysToDateStr(dateStr, -1);
  }

  return {
    streak: Math.max(maxStreak, state.streak),
    foodStreak: Math.max(maxFood, state.foodStreak),
    goalStreak: Math.max(maxGoal, state.goalStreak),
    megaStreak: Math.max(maxMega, state.megaStreak),
  };
}

export interface PersonalBests {
  bestDayPoints: number;
  bestDayDateStr: string | null;
  fullTrayDays: number;
  comboDays: number;
  allGoalsDays: number;
  longestStreakEver: StreakRecord;
}

export function getPersonalBests(state: GravyState): PersonalBests {
  const today = todayStr(state.settings.timezone);
  const bestDayPoints = state.counters.maxDayPoints;

  // applyAward/applyBonusItem keep counters.maxDayPoints in sync with todayPoints live, so
  // todayPoints can equal the record but never exceed it — check today first since it isn't
  // in dayLogs yet.
  let bestDayDateStr: string | null = null;
  if (bestDayPoints > 0) {
    if (state.todayPoints === bestDayPoints) {
      bestDayDateStr = today;
    } else {
      for (const [dateStr, log] of Object.entries(state.dayLogs)) {
        if (log.points === bestDayPoints && (!bestDayDateStr || dateStr > bestDayDateStr)) {
          bestDayDateStr = dateStr;
        }
      }
    }
  }

  return {
    bestDayPoints,
    bestDayDateStr,
    fullTrayDays: state.counters.fullTrayDays,
    comboDays: state.counters.comboDays,
    allGoalsDays: state.counters.allGoalsDays,
    longestStreakEver: getLongestStreakEver(state),
  };
}
