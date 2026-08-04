// Generates the shared Demo Mode household: two kid profiles with fabricated-but-internally-
// consistent history (streaks, points, pending approvals, game activity). Pure data/functions only
// (no React/DOM/FontAwesome) so this module can run both in the client bundle and in the
// `reseed-demo` Supabase Edge Function (Deno) via a relative import — see BACKLOG.md/CLAUDE.md for
// the Demo Mode feature this backs.
import type {
  ActionLogEntry,
  ActionLogType,
  AuditLogEntry,
  AuditLogType,
  Counters,
  DayLog,
  GravyRoot,
  GravyState,
  ProfileEntry,
  RollToGoalRoundLogEntry,
} from './types';
import { FOODS } from '../data/foods';
import {
  addDaysToDateStr,
  applyDayRollover,
  backfillStreaksFromLogs,
  cloneDefaultState,
  makeNewProfile,
  mirrorSharedFields,
  todayStr,
} from './defaultState';

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// One fabricated day, expressed in the same terms applyDayRollover/backfillStreaksFromLogs key
// off: whether every food group was logged, how many of the (front N) daily goals were done, and
// an optional single Bonus Points tap.
interface DayPlan {
  fullTray: boolean;
  goalsDone: number;
  bonusGoalId?: number;
}

function dayTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

let logSeq = 0;
function logEntry(
  type: ActionLogType,
  label: string,
  pts: number,
  dateStr: string,
  at: number,
  itemId?: number | string,
): ActionLogEntry {
  logSeq += 1;
  return { id: `demo-${at}-${logSeq}`, type, label, pts, dateStr, at, ...(itemId !== undefined ? { itemId } : {}) };
}

// Builds dayLogs (+ matching actionLog entries, dated to each fabricated day rather than "now")
// for `plans`, walking backward day-by-day from yesterday — plans[0] is yesterday, plans[last] is
// the furthest back. Skips 'sweets' on a non-full-tray day so "not full tray" still looks like a
// normal (mostly good) day, not an empty one.
function buildHistory(
  state: GravyState,
  plans: DayPlan[],
  timezone: string,
): { dayLogs: Record<string, DayLog>; actionLog: ActionLogEntry[] } {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const dayLogs: Record<string, DayLog> = {};
  const actionLog: ActionLogEntry[] = [];
  let dateStr = addDaysToDateStr(todayStr(timezone), -1);
  for (const plan of plans) {
    const at = dayTimestamp(dateStr);
    const foodCounts: Record<string, number> = {};
    let points = 0;
    for (const f of FOODS) {
      if (!plan.fullTray && f.id === 'sweets') continue;
      foodCounts[f.id] = 1;
      const pts = state.settings.foodPtsByItem[f.id] ?? 10;
      points += pts;
      actionLog.push(logEntry('food', `Logged ${f.label}`, pts, dateStr, at, f.id));
    }
    const goalIds: number[] = [];
    for (let i = 0; i < plan.goalsDone && i < dailyGoals.length; i++) {
      const g = dailyGoals[i];
      goalIds.push(g.id);
      points += g.pts;
      actionLog.push(logEntry('goal', g.name, g.pts, dateStr, at, g.id));
    }
    let bonusCounts: Record<number, number> | undefined;
    let bonusApplied: Record<number, number> | undefined;
    const bonus = plan.bonusGoalId != null ? state.goals.find((g) => g.id === plan.bonusGoalId) : undefined;
    if (bonus) {
      bonusCounts = { [bonus.id]: 1 };
      bonusApplied = { [bonus.id]: bonus.pts };
      points += bonus.pts;
      actionLog.push(logEntry('bonus', bonus.name, bonus.pts, dateStr, at, bonus.id));
    }
    dayLogs[dateStr] = {
      foodCounts,
      goalIds,
      points,
      ...(bonusCounts ? { bonusCounts, bonusApplied } : {}),
    };
    dateStr = addDaysToDateStr(dateStr, -1);
  }
  return { dayLogs, actionLog };
}

function computeCounters(
  dayLogs: Record<string, DayLog>,
  dailyGoalCount: number,
  today: { foodCounts: Record<string, number>; goalIds: number[]; points: number },
  gamesPlayed: number,
  gamesWon: number,
  totalRewards: number,
): Counters {
  const foodLogs: Record<string, number> = {};
  let fullTrayDays = 0;
  let totalGoals = 0;
  let allGoalsDays = 0;
  let comboDays = 0;
  let maxDayPoints = today.points;
  for (const log of Object.values(dayLogs)) {
    for (const [id, count] of Object.entries(log.foodCounts)) foodLogs[id] = (foodLogs[id] || 0) + count;
    const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
    const allGoals = dailyGoalCount > 0 && log.goalIds.length === dailyGoalCount;
    if (fullTray) fullTrayDays++;
    if (allGoals) allGoalsDays++;
    if (fullTray && allGoals) comboDays++;
    totalGoals += log.goalIds.length;
    if (log.points > maxDayPoints) maxDayPoints = log.points;
  }
  for (const [id, count] of Object.entries(today.foodCounts)) foodLogs[id] = (foodLogs[id] || 0) + count;
  totalGoals += today.goalIds.length;
  return { foodLogs, fullTrayDays, totalGoals, allGoalsDays, comboDays, totalRewards, maxDayPoints, gamesPlayed, gamesWon };
}

function auditEntry(type: AuditLogType, label: string, at: number): AuditLogEntry {
  logSeq += 1;
  return { id: `demo-audit-${at}-${logSeq}`, type, label, at };
}

interface KidSpec {
  history: DayPlan[]; // index 0 = yesterday
  today: { goalsDone: number; foodIds: string[]; game?: RollToGoalRoundLogEntry[] };
  approvedRewardId?: number; // a reward simulated as already-approved historically
  pendingRewardId: number; // a reward simulated as currently awaiting approval
  gamesPlayed: number;
  gamesWon: number;
}

// Populates all the derived fields (dayLogs, streaks, counters, points, today*, logs, one pending
// reward) onto a freshly-cloned/shared-inherited GravyState, using the exact primitives real code
// uses (backfillStreaksFromLogs, applyDayRollover) so the fabricated history can't drift out of
// internal consistency with what the app itself would compute from the same dayLogs.
function populateKid(state: GravyState, spec: KidSpec): void {
  const timezone = state.settings.timezone;
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const { dayLogs, actionLog } = buildHistory(state, spec.history, timezone);
  state.dayLogs = dayLogs;
  state.actionLog = actionLog;

  // Today: partial progress, so the home screen looks actively in-use rather than purely historical.
  const todayGoals = dailyGoals.slice(0, spec.today.goalsDone).map((g) => g.id);
  const todayGoalCounts: Record<number, number> = {};
  for (const id of todayGoals) todayGoalCounts[id] = 1;
  const todayFoodCounts: Record<string, number> = {};
  const today = todayStr(timezone);
  const nowAt = dayTimestamp(today);
  let todayPoints = 0;
  for (const foodId of spec.today.foodIds) {
    todayFoodCounts[foodId] = 1;
    const pts = state.settings.foodPtsByItem[foodId] ?? 10;
    todayPoints += pts;
    const food = FOODS.find((f) => f.id === foodId);
    if (food) actionLog.push(logEntry('food', `Logged ${food.label}`, pts, today, nowAt, food.id));
  }
  for (const id of todayGoals) {
    const g = dailyGoals.find((gg) => gg.id === id);
    if (!g) continue;
    todayPoints += g.pts;
    actionLog.push(logEntry('goal', g.name, g.pts, today, nowAt, g.id));
  }
  const rollGoalRoundsLog = spec.today.game ?? [];
  for (const round of rollGoalRoundsLog) {
    todayPoints += round.pts;
    actionLog.push(logEntry('game', `Roll to the Goal — round ${round.round}`, round.pts, today, round.at));
  }

  state.todayFoodCounts = todayFoodCounts;
  state.todayGoals = todayGoals;
  state.todayGoalCounts = todayGoalCounts;
  state.todayBonusApplied = {};
  state.todayPoints = todayPoints;
  state.rollGoalRoundsToday = rollGoalRoundsLog.length;
  state.rollGoalDailyScore = rollGoalRoundsLog.reduce((sum, r) => sum + r.displayScore, 0);
  state.rollGoalRoundsLog = rollGoalRoundsLog;

  const historyTotal = Object.values(dayLogs).reduce((sum, log) => sum + log.points, 0);
  state.totalPoints = historyTotal + todayPoints;

  const pendingReward = { id: genId(), rewardId: spec.pendingRewardId };
  state.pendingRewards = [pendingReward];
  actionLog.push(logEntry('rewardRequested', 'Reward requested!', 0, today, nowAt, spec.pendingRewardId));

  let approvedCost = 0;
  let totalRewardRequests = 1; // the currently-pending one
  if (spec.approvedRewardId != null) {
    const reward = state.rewards.find((r) => r.id === spec.approvedRewardId);
    if (reward) {
      approvedCost = reward.cost;
      totalRewardRequests += 1;
      const approvedAt = dayTimestamp(addDaysToDateStr(today, -3));
      actionLog.push(logEntry('rewardRequested', 'Reward requested!', 0, addDaysToDateStr(today, -3), approvedAt - 1000, reward.id));
      actionLog.push(logEntry('rewardApproved', `${reward.name} approved!`, -reward.cost, addDaysToDateStr(today, -3), approvedAt, reward.id));
    }
  }
  state.points = state.totalPoints - approvedCost;

  state.counters = computeCounters(
    dayLogs,
    dailyGoals.length,
    { foodCounts: todayFoodCounts, goalIds: todayGoals, points: todayPoints },
    spec.gamesPlayed,
    spec.gamesWon,
    totalRewardRequests,
  );

  // General activity streak: every fabricated day has activity by construction, so it's simply
  // the count of fabricated days. The other three streaks are derived from dayLogs by the same
  // helper real saves use, so they can't drift out of sync with the fabricated per-day flags.
  state.streak = spec.history.length;
  state.lastActiveDate = today;
  backfillStreaksFromLogs(state);
  applyDayRollover(state);
}

export function createDemoRoot(): GravyRoot {
  const mayaState = cloneDefaultState();
  mayaState.settings.childName = 'Maya';
  mayaState.settings.avatarIcon = 'faceGrinStars';
  mayaState.settings.avatarIconColor = '#C1440E';
  mayaState.settings.avatarBgColor = '#FFF3E0';
  mayaState.settings.theme = 'twopointoh';

  const mayaHistory: DayPlan[] = [
    { fullTray: true, goalsDone: 8, bonusGoalId: 9 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 7 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: false, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8, bonusGoalId: 13 },
    { fullTray: true, goalsDone: 6 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
  ];

  populateKid(mayaState, {
    history: mayaHistory,
    today: {
      goalsDone: 4,
      foodIds: ['fruit', 'veggie', 'protein'],
      game: [
        { round: 1, tier: 'near1', total: 46, displayScore: 460, pts: 20, pending: false, at: dayTimestamp(todayStr(mayaState.settings.timezone)) + 1000 },
        { round: 2, tier: 'bust', total: 12, displayScore: 120, pts: 0, pending: false, at: dayTimestamp(todayStr(mayaState.settings.timezone)) + 2000 },
      ],
    },
    approvedRewardId: 2,
    pendingRewardId: 4,
    gamesPlayed: 14,
    gamesWon: 6,
  });

  mayaState.auditLog = [
    auditEntry('profileAdded', 'Added profile: Leo', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -10))),
    auditEntry('settingChanged', 'Updated points for Veggie to 10 pts', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -6))),
    auditEntry('goalUpdated', 'Updated goal: 1 hour of creative time', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -2))),
  ];

  const mayaEntry: ProfileEntry = { id: genId(), state: mayaState };

  const leoEntry = makeNewProfile('Leo', mayaState, {
    avatarIcon: 'userAstronaut',
    avatarIconColor: '#3D5A80',
    avatarBgColor: '#E8F1F8',
    theme: 'twopointoh',
  });
  const leoHistory: DayPlan[] = [
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 6 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: false, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 5 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
  ];

  populateKid(leoEntry.state, {
    history: leoHistory,
    today: { goalsDone: 2, foodIds: ['fruit'] },
    pendingRewardId: 2,
    gamesPlayed: 7,
    gamesWon: 2,
  });

  const root: GravyRoot = {
    version: 2,
    activeProfileId: mayaEntry.id,
    profiles: [mayaEntry, leoEntry],
  };
  mirrorSharedFields(root);
  return root;
}
